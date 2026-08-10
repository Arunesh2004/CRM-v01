import { JobPayload } from '@/../src/lib/queue/JobQueueProvider';
import { prismaAdmin } from '@/../database/utils/prisma';
import { getStorageProvider } from '@/../src/lib/storage';
import { KeyManagementService } from './security/KeyManagementService';
import crypto from 'crypto';

export class RestoreWorker {
  
  async processChunk(payload: JobPayload) {
    const { tenantId, jobId, metadata } = payload;
    
    // 1. Double check tenant is locked and job is active
    const tenant = await prismaAdmin.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.isRestoreLocked) {
      throw new Error('Tenant is not locked. Processing aborted to prevent data corruption.');
    }
    
    // 2. Idempotency Check via Checkpoint
    const chunkId = metadata.chunkId;
    const existingCheckpoint = await prismaAdmin.restoreCheckpoint.findUnique({ where: { chunkId } });
    
    if (existingCheckpoint && existingCheckpoint.status === 'COMPLETED') {
      console.log(`Chunk ${chunkId} already completed. Acking idemptoently.`);
      return; 
    }

    if (!existingCheckpoint) {
      await prismaAdmin.restoreCheckpoint.create({
        data: {
          chunkId,
          recoveryJobId: jobId,
          tenantId,
          phase: metadata.phase,
          model: metadata.model,
          chunkIndex: metadata.chunkIndex,
          status: 'PENDING'
        }
      });
    } else {
      await prismaAdmin.restoreCheckpoint.update({
        where: { chunkId },
        data: { attempt: { increment: 1 }, status: 'PENDING' }
      });
    }

    try {
      // 3. Database Execution
      await prismaAdmin.$transaction(async (tx) => {
        // Execute the exact createMany block with skipDuplicates
        // We use dynamic model injection for the SAGA
        const modelDelegate = (tx as any)[metadata.model.toLowerCase()];
        if (!modelDelegate) throw new Error(`Invalid model ${metadata.model}`);

        // The chunk data is passed via metadata in this simplified event-driven model
        // In real massive streams, this would fetch just the byte-range from S3. 
        // For our scale constraint, we are simulating the bounded chunk insert.
        if (metadata.records && metadata.records.length > 0) {
          await modelDelegate.createMany({
            data: metadata.records,
            skipDuplicates: true
          });
        }
        
        // 4. Atomic Checkpoint Completion inside the same transaction
        // If the worker crashes immediately after this commit, the Checkpoint will say COMPLETED.
        // If BullMQ redelivers, Step 2 will catch it.
        await tx.restoreCheckpoint.update({
          where: { chunkId },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });
      }, { timeout: 30000 }); // strict 30s timeout per chunk

    } catch (error: any) {
      await prismaAdmin.restoreCheckpoint.update({
        where: { chunkId },
        data: { status: 'FAILED', errorMessage: error.message }
      });
      throw error; // Let BullMQ catch it and retry with Exponential Backoff
    }
  }

}
