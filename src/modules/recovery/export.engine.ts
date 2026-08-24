import { prismaAdmin } from '@db/utils/prisma';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import zlib from 'zlib';
import { PassThrough, Transform } from 'stream';
import { getStorageProvider } from '../../lib/storage';
import { KeyManagementService } from './security/KeyManagementService';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export async function exportTenant(tenantId: string, requestorUserId: string, existingJobId?: string) {
  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: tenantId }
  });
  if (!tenant) throw new Error('Tenant not found');
  if (tenant.ownerId !== requestorUserId) {
    throw new Error('Forbidden: Only the Tenant Owner can export the tenant.');
  }

  let job;
  if (existingJobId) {
    job = await prismaAdmin.recoveryJob.update({
      where: { id: existingJobId },
      data: { status: 'IN_PROGRESS', startedAt: new Date() }
    });
  } else {
    job = await prismaAdmin.recoveryJob.create({
      data: {
        tenantId,
        requestedBy: requestorUserId,
        mode: 'RECOVERY',
        status: 'IN_PROGRESS',
        startedAt: new Date()
      }
    });
  }

  await logAudit(tenantId, job.id, 'EXPORT_STARTED', requestorUserId);

  try {
    const jsonStream = new PassThrough();
    const hashStream = crypto.createHash('sha256');

    // Create a custom transform to both hash and pass data through
    const hashTransform = new Transform({
      transform(chunk, encoding, callback) {
        hashStream.update(chunk);
        callback(null, chunk);
      }
    });

    const dataKey = await KeyManagementService.generateDataKey();

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, dataKey.plaintextDEK, iv);
    const gzip = zlib.createGzip();

    // The data pipeline: jsonStream -> hashTransform -> gzip -> cipher
    // We can't use pipeline() easily with upload if upload expects a Readable.
    // Instead of pipeline(), we can just chain them and pass the final cipher stream to upload.
    const finalStream = jsonStream.pipe(hashTransform).pipe(gzip).pipe(cipher);

    const storage = getStorageProvider();
    const objectKey = `tenant_${tenantId}_${Date.now()}.json.enc`;

    // Start upload asynchronously
    const uploadPromise = storage.upload(tenantId, objectKey, finalStream);

    // Asynchronously write to jsonStream
    (async () => {
      try {
        jsonStream.write('{\n');
        jsonStream.write(`  "metadata": {\n`);
        jsonStream.write(`    "tenantId": "${tenantId}",\n`);
        jsonStream.write(`    "exportDate": "${new Date().toISOString()}",\n`);
        jsonStream.write(`    "schemaVersion": "1.0",\n`);
        jsonStream.write(`    "applicationVersion": "1.0.0",\n`);
        jsonStream.write(`    "prismaVersion": "6.19.3",\n`);
        jsonStream.write(`    "backupFormatVersion": "1"\n`);
        jsonStream.write(`  },\n`);

        const exportTable = async (tableName: string, prismaModel: any, isLast = false) => {
          jsonStream.write(`  "${tableName}": [\n`);
          let cursor: string | undefined = undefined;
          let isFirstRecord = true;
          let hasMore = true;
          const CHUNK_SIZE = 5000;
          const model = tableName;

          while (hasMore) {
            const records: any[] = (await (prismaAdmin as any)[model].findMany({
              where: tableName === 'tenant' ? { id: tenantId } : { tenantId },
              take: CHUNK_SIZE,
              skip: cursor ? 1 : 0,
              cursor: cursor ? { id: cursor } : undefined,
              orderBy: { id: 'asc' }
            }));

            for (const record of records) {
              if (!isFirstRecord) jsonStream.write(',\n');
              jsonStream.write(`    ${JSON.stringify(record)}`);
              isFirstRecord = false;
            }

            if (records.length === CHUNK_SIZE) {
              cursor = records[records.length - 1].id;
            } else {
              hasMore = false;
            }
          }
          jsonStream.write(`\n  ]${isLast ? '' : ','}\n`);
        };

        await exportTable('tenant', prismaAdmin.tenant);
        await exportTable('roles', prismaAdmin.role);
        await exportTable('users', prismaAdmin.user);
        await exportTable('customers', prismaAdmin.customer);
        await exportTable('leads', prismaAdmin.lead);
        await exportTable('tasks', prismaAdmin.task);
        await exportTable('chatConversation', prismaAdmin.chatConversation);
        await exportTable('chatParticipant', prismaAdmin.chatParticipant);
        await exportTable('chatMessage', prismaAdmin.chatMessage);
        await exportTable('communicationAttachment', prismaAdmin.communicationAttachment);
        await exportTable('mailThread', prismaAdmin.mailThread);
        await exportTable('mailRecipient', prismaAdmin.mailRecipient);
        await exportTable('mailMessage', prismaAdmin.mailMessage);
        await exportTable('callLog', prismaAdmin.callLog);
        await exportTable('incidents', prismaAdmin.incident);
        await exportTable('auditLogs', prismaAdmin.auditLog, true);

        jsonStream.write('}\n');
        jsonStream.end();
      } catch (err) {
        jsonStream.destroy(err as Error);
      }
    })();

    // Wait for the upload to complete
    const uploadedUri = await uploadPromise;
    const authTag = cipher.getAuthTag();
    const checksum = hashStream.digest('hex');

    const archiveLocation = `${uploadedUri}?iv=${iv.toString('hex')}&tag=${authTag.toString('hex')}`;

    const snapshot = await prismaAdmin.recoverySnapshot.create({
      data: {
        tenantId,
        version: 1,
        schemaVersion: '1.0',
        applicationVersion: '1.0.0',
        prismaVersion: '6.19.3',
        backupFormatVersion: '1',
        encryptionAlgorithm: ENCRYPTION_ALGORITHM,
        encryptedDEK: dataKey.encryptedDEK,
        kmsKeyId: dataKey.kmsKeyId,
        kmsKeyVersion: dataKey.kmsKeyVersion,
        checksum,
        status: 'ACTIVE',
        sizeBytes: 0 // Cannot easily calculate final size after streaming without counting chunks in a stream Transform
      }
    });

    await prismaAdmin.recoveryJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        checksum,
        archiveLocation,
        snapshotId: snapshot.id
      }
    });

    await logAudit(tenantId, job.id, 'SUCCESS', requestorUserId, { checksum, archiveLocation });

    return { jobId: job.id, archiveLocation, checksum };

  } catch (error: any) {
    await prismaAdmin.recoveryJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error.message
      }
    });
    await logAudit(tenantId, job.id, 'FAILURE', requestorUserId, { error: error.message });
    throw error;
  }
}

async function logAudit(tenantId: string, jobId: string, action: string, actorId: string, metadata?: any) {
  await prismaAdmin.recoveryAuditLog.create({
    data: {
      tenantId,
      jobId,
      action,
      actorId,
      metadata: metadata || {}
    }
  });
}
