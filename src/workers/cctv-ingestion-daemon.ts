import crypto from "crypto";
import path from "path";
import fs from "fs/promises";
import { PrismaClient } from "@prisma/client";
import { parseOpaquePath } from "../modules/cctv/opaque-path.helper";
import { assertPathInRoot } from "../modules/cctv/validators/path.validator";
import { ENV } from "../lib/config/env";
import { uploadFile } from "../lib/providers/storage/s3.provider";
import { Logger } from "../lib/observability/logger";

const globalPrisma = new PrismaClient();
const logger = new Logger();

export async function processIngestionJobs() {
  const workerId = crypto.randomUUID();

  try {
    // 1. Claim Jobs
    const claimedJobIdsResult = await globalPrisma.$queryRaw<{ id: string }[]>`
      UPDATE "RecordingIngestionJob"
      SET 
        status = 'PROCESSING', 
        "workerId" = ${workerId}, 
        "leaseExpiresAt" = NOW() + INTERVAL '10 minutes',
        "updatedAt" = NOW()
      WHERE id IN (
        SELECT id FROM "RecordingIngestionJob"
        WHERE 
          (status = 'PENDING')
          OR (status = 'RETRY_SCHEDULED' AND "nextAttemptAt" <= NOW())
          OR (status = 'PROCESSING' AND "leaseExpiresAt" <= NOW())
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 10
      )
      RETURNING id;
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    const claimedJobIds = claimedJobIdsResult.map((r: any) => r.id);

    if (claimedJobIds.length === 0) {
      return 0;
    }

    const jobs = await globalPrisma.recordingIngestionJob.findMany({
      where: { id: { in: claimedJobIds } },
    });

    let processedCount = 0;

    for (const job of jobs) {
      let canonicalFilePath: string | null = null;
      try {
        // 2. Validate Path and Identity
        canonicalFilePath = await assertPathInRoot(
          job.localFilePath,
          ENV.cctvRecordingsRoot,
        );
        const opaquePath = path.basename(path.dirname(canonicalFilePath));
        const filename = path.basename(canonicalFilePath);

        const { tenantId, cameraId, streamVersion } =
          parseOpaquePath(opaquePath);

        // R07 Fix: Look up camera including soft-deleted entries for grace-period validation.
        // Uses daemon's own globalPrisma (bare PrismaClient — no soft-delete extension from prisma.ts).
        // RLS tenant context is set explicitly before the query. tenantId comes from parseOpaquePath().
        // This does NOT affect user-facing camera queries which continue to use withTenant().
        const camera = await globalPrisma.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
          return tx.camera.findFirst({ where: { id: cameraId, tenantId } });
        });

        if (!camera || camera.tenantId !== tenantId) {
          throw new Error(
            "Identity mismatch: Camera not found or belongs to another tenant",
          );
        }

        // R07 Security: Validate streamVersion from opaque path matches camera's current generation.
        // A mismatch indicates a stale or forged path — reject to prevent cross-stream recording confusion.
        if (camera.streamVersion !== streamVersion) {
          throw new Error(
            `Identity mismatch: Stream version ${streamVersion} does not match camera stream version ${camera.streamVersion}`,
          );
        }

        // 3. Validate Soft-Deletion Bound
        // filename is YYYY-MM-DD_HH-MM-SS.mp4 in UTC
        const dateMatch = filename.match(
          /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.mp4$/,
        );
        let segmentStartTime = new Date();
        if (dateMatch) {
          const [, Y, M, D, h, m, s] = dateMatch;
          segmentStartTime = new Date(Date.UTC(+Y, +M - 1, +D, +h, +m, +s));
        }

        if (camera.deletedAt) {
          // Allow 1 minute clock skew
          const maxAllowedTime = camera.deletedAt.getTime() + 60000;
          if (segmentStartTime.getTime() > maxAllowedTime) {
            throw new Error("Post-deletion artifact rejected");
          }
        }

        // 4. Upload to Storage
        const storageKey = `cctv_recordings/${tenantId}/${cameraId}/v${streamVersion}/${job.segmentId}.mp4`;
        await uploadFile(canonicalFilePath, storageKey);

        // 5. Create DB Metadata
        let stat;
        try {
          stat = await fs.stat(canonicalFilePath);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
        } catch (e) {
          throw new Error("Local file disappeared during processing");
        }

        // 6. Transactional commit: Prove ownership, Upsert Recording, Create AI Job, Complete Job
        await globalPrisma.$transaction(async (tx) => {
          // R03: Parameterized tenant context setting to prevent SQL injection while preserving transaction GUC
          await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;

          // 6.1 Prove ownership first via hard fence
          const fence = await tx.recordingIngestionJob.updateMany({
            where: { id: job.id, workerId, status: "PROCESSING" },
            data: { updatedAt: new Date() }, // dummy update to force query
          });
          if (fence.count !== 1) {
            throw new Error(`Lease lost or expired. fence: ${fence.count}`);
          }

          // 6.2 Upsert to handle the case where DB insertion failed previously but upload succeeded
          const recording = await tx.recording.upsert({
            where: { segmentId: job.segmentId },
            create: {
              segmentId: job.segmentId,
              tenantId,
              cameraId,
              streamVersion,
              storageKey,
              status: "COMPLETED",
              startTime: segmentStartTime,
              sizeBytes: stat.size,
            },
            update: {},
          });

          // 6.3 Queue AI Job atomically (Idempotent via dedupeKey)
          await tx.aIAnalysisJob.upsert({
            where: { dedupeKey: job.segmentId + "-vision" },
            create: {
              recordingId: recording.id,
              analysisType: "vision",
              dedupeKey: job.segmentId + "-vision",
            },
            update: {},
          });

          const completion = await tx.recordingIngestionJob.updateMany({
            where: { id: job.id, workerId, status: "PROCESSING" },
            data: { status: "COMPLETED", workerId: null, leaseExpiresAt: null },
          });
          if (completion.count !== 1)
            throw new Error("Lease lost before completion");
        });

        // 7. Cleanup local file

        try {
          await fs.unlink(canonicalFilePath);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
        } catch (e) {
          logger.warn(
            `Failed to unlink ${job.localFilePath}, reconciliation will clean it up later.`,
          );
        }

        processedCount++;
      } catch (errRaw: unknown) {
        const err =
          errRaw instanceof Error ? errRaw : new Error(String(errRaw));
        logger.error(`Job ${job.id} failed:`, undefined, err);
        const attempts = job.attempts + 1;
        const maxAttempts = 5;

        const newStatus =
          attempts >= maxAttempts ? "FAILED" : "RETRY_SCHEDULED";
        const terminalReason =
          err.message.includes("Identity mismatch") ||
          err.message.includes("Post-deletion") ||
          err.message.includes("Security violation") ||
          err.message.includes("HMAC validation failed") ||
          err.message.includes("Invalid opaque path format")
            ? "REJECTED"
            : null;

        // If rejected for identity/bounds, we fail it immediately
        const finalStatus = terminalReason ? "FAILED" : newStatus;
        const backoffMs = Math.pow(2, attempts) * 60000 + Math.random() * 30000;

        await globalPrisma.recordingIngestionJob.updateMany({
          where: { id: job.id, workerId, status: "PROCESSING" },
          data: {
            status: finalStatus,
            terminalReason,
            attempts,
            nextAttemptAt: new Date(Date.now() + backoffMs),
            workerId: null,
            leaseExpiresAt: null,
          },
        });

        // Quarantine file if rejected permanently (only if safe to do so)
        if (terminalReason && canonicalFilePath) {
          const quarantineDir = "/var/lib/mediamtx/quarantine";

          try {
            await fs.mkdir(quarantineDir, { recursive: true });
            await fs.rename(
              canonicalFilePath,
              path.join(quarantineDir, path.basename(canonicalFilePath)),
            );
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
          } catch (e) {}
        }
      }
    }

    return processedCount;
  } catch (errorRaw: unknown) {
    const error =
      errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    logger.error("[Ingestion Worker Error]", undefined, error);
    return 0;
  }
}

// Daemon Loop
async function runDaemon() {
  logger.info("Starting CCTV Ingestion Daemon...");
  while (true) {
    try {
      const processed = await processIngestionJobs();
      if (processed === 0) {
        // Sleep for 5 seconds if no jobs
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        logger.info(`Processed ${processed} ingestion jobs`);
      }
    } catch (err) {
      logger.error("Daemon loop error", undefined, err as Error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Start if run directly
if (require.main === module) {
  runDaemon();
}
