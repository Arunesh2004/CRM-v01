import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withTenant } from '@db/utils/prisma-tenant';
import crypto from 'crypto';
import zlib from 'zlib';
import { PassThrough } from 'stream';
import { getStorageProvider } from '../../lib/storage';
import { KeyManagementService } from './security/KeyManagementService';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export async function requestRestore(archiveLocation: string, checksum: string, requestorUserId: string, mode: 'RECOVERY' | 'CLONE' | 'DRY_RUN' = 'DRY_RUN') {
  // 1. Resolve archive ownership
  let sourceTenantId = '';
  const [uri] = archiveLocation.split('?');

  if (uri.startsWith('local://')) {
    const parts = uri.replace('local://', '').split('/');
    sourceTenantId = parts[0];
  } else if (uri.startsWith('s3://')) {
    const parts = uri.replace('s3://', '').split('/');
    sourceTenantId = parts[2];
  } else {
    throw new Error('Unsupported storage URI format');
  }

  // 2. Fetch RecoverySnapshot to validate source of truth
  const tenantPrisma = withTenant(sourceTenantId);
  const snapshot = await tenantPrisma.recoverySnapshot.findFirst({
    where: { tenantId: sourceTenantId, checksum }
  });

  if (!snapshot) {
    throw new Error('Forbidden: Archive identity cannot be verified (Enumeration prevention)');
  }

  // 3. Verify requester authority
  const tenant = await tenantPrisma.tenant.findUnique({
    where: { id: sourceTenantId }
  });

  if (!tenant) {
    throw new Error('Source tenant not found');
  }

  if (tenant.ownerId !== requestorUserId) {
    throw new Error('Forbidden: Only the Tenant Owner can request a restore.');
  }

  // 4. Check if object actually exists
  const storage = getStorageProvider();
  let objectKey = '';
  if (uri.startsWith('local://')) {
    objectKey = uri.replace('local://', '').split('/')[1];
  } else if (uri.startsWith('s3://')) {
    objectKey = uri.replace('s3://', '').split('/')[4];
  }
  
  if (!objectKey) {
     throw new Error('Invalid archiveLocation format');
  }

  const exists = await storage.verifyObjectExists(sourceTenantId, objectKey);
  if (!exists) {
    throw new Error('Archive location does not exist or is inaccessible');
  }

  // 5. Create a REQUESTED job
  return await tenantPrisma.recoveryJob.create({
    data: {
      tenantId: sourceTenantId,
      requestedBy: requestorUserId,
      mode,
      status: 'REQUESTED',
      startedAt: new Date(),
      archiveLocation,
      checksum,
      snapshotId: snapshot.id
    }
  });
}

export async function approveRestore(jobId: string) {
  await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoveryJob.update({
    where: { id: jobId },
    data: { status: 'APPROVED' }
  }));
}

export async function executeRestore(jobId: string) {
  const job = await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoveryJob.findUnique({ where: { id: jobId } }));
  if (!job) throw new Error('Job not found');
  if (job.status !== 'APPROVED' && job.mode !== 'DRY_RUN') {
    throw new Error('Restore job must be APPROVED before execution (unless DRY_RUN).');
  }

  await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoveryJob.update({
    where: { id: jobId },
    data: { status: 'VALIDATING' }
  }));

  try {
    const result = await processRestore(job);
    return result;
  } catch (error: any) {
    await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoveryJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', completedAt: new Date(), errorMessage: error.message }
    }));
    throw error;
  }
}

async function processRestore(job: any) {
  const { archiveLocation, requestedBy: requestorUserId, mode, id: jobId } = job;
  
  const [uri, query] = archiveLocation.split('?');
  const params = new URLSearchParams(query);
  const ivHex = params.get('iv');
  const tagHex = params.get('tag');

  if (!ivHex || !tagHex) throw new Error('Invalid archive location format');

  let tenantIdToDownload = 'unknown';
  let objectKey = 'unknown';
  
  if (uri.startsWith('local://')) {
    const parts = uri.replace('local://', '').split('/');
    tenantIdToDownload = parts[0];
    objectKey = parts[1];
  } else if (uri.startsWith('s3://')) {
    const parts = uri.replace('s3://', '').split('/');
    // Format: s3://bucket/tenants/<tenantId>/recovery/<key>
    tenantIdToDownload = parts[2];
    objectKey = parts[4];
  } else {
    throw new Error('Unsupported storage URI');
  }

  const storage = getStorageProvider();
  const snapshot = await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoverySnapshot.findFirst({
    where: { tenantId: tenantIdToDownload, checksum: job.checksum },
    orderBy: { createdAt: 'desc' }
  }));

  if (!snapshot) {
    throw new Error('Checksum validation failed: No matching snapshot found in database');
  }

  const encryptedDEK = snapshot.encryptedDEK;
  const kmsKeyId = snapshot.kmsKeyId;
  const kmsKeyVersion = snapshot.kmsKeyVersion || undefined;

  if (!encryptedDEK || !kmsKeyId) {
    throw new Error('Encryption envelope details missing from snapshot');
  }

  const plaintextDEK = await KeyManagementService.decryptKey(encryptedDEK, kmsKeyId, kmsKeyVersion);

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(snapshot.encryptionAlgorithm || ENCRYPTION_ALGORITHM, plaintextDEK, iv);
  (decipher as any).setAuthTag(authTag);
  const gunzip = zlib.createGunzip();

  let decryptedContent = '';
  
  await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoveryJob.update({
    where: { id: jobId },
    data: { status: 'IN_PROGRESS' }
  }));

  const sourceStream = await storage.download(tenantIdToDownload, objectKey);
  
  return new Promise((resolve, reject) => {
    sourceStream.on('error', reject);
    decipher.on('error', reject);
    gunzip.on('error', reject);

    sourceStream
      .pipe(decipher)
      .pipe(gunzip)
      .on('data', (chunk) => {
        decryptedContent += chunk.toString();
      })
      .on('end', async () => {
        try {
          const calculatedChecksum = crypto.createHash('sha256').update(decryptedContent).digest('hex');
          const payload = JSON.parse(decryptedContent);
          const originalTenantId = payload.metadata.tenantId;

          const snapshot = await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoverySnapshot.findFirst({
            where: { checksum: calculatedChecksum }
          }));
      
          if (!snapshot) {
            throw new Error('Checksum validation failed: No matching snapshot found in database');
          }

          if (snapshot.schemaVersion !== '1.0' || snapshot.backupFormatVersion !== '1') {
            throw new Error('Incompatible backup version.');
          }

          const originalTenant = await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.tenant.findUnique({
            where: { id: originalTenantId }
          }));
      
          const payloadOwnerId = payload.tenant && payload.tenant.length > 0 ? payload.tenant[0].ownerId : null;
          if (payloadOwnerId !== requestorUserId) {
            throw new Error('Forbidden: Only the original Tenant Owner can restore this archive.');
          }
      
          let targetTenantId = originalTenantId;
          const newTenantId = crypto.randomUUID();
          
          if (mode === 'CLONE') {
            targetTenantId = newTenantId;
          }
      
          if (mode === 'DRY_RUN') {
            await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoveryJob.update({
              where: { id: jobId },
              data: { status: 'COMPLETED', completedAt: new Date(), tenantId: targetTenantId }
            }));
            return resolve({ success: true, mode: 'DRY_RUN', validation: 'PASS' });
          }
      
          await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoveryJob.update({
            where: { id: jobId },
            data: { tenantId: targetTenantId }
          }));
      
          const mapTenantId = (data: any[]) => {
            if (mode !== 'CLONE') return data;
            return data.map(item => {
              if (item.tenantId === originalTenantId) item.tenantId = targetTenantId;
              if (item.id === originalTenantId) item.id = targetTenantId;
              return item;
            });
          };
      
          await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => {
            const insert = async (model: any, data: any[]) => {
              if (!data || data.length === 0) return;
              await model.createMany({ data: mapTenantId(data), skipDuplicates: true });
            };
      
            const tenantsWithoutOwner = (payload.tenant || []).map((t: any) => ({ ...t, ownerId: null }));
            await insert(tx.tenant, tenantsWithoutOwner);
            
            await insert(tx.role, payload.roles);
            await insert(tx.user, payload.users);
            
            for (const t of (payload.tenant || [])) {
               if (t.ownerId) {
                   const mappedId = mode === 'CLONE' ? targetTenantId : t.id;
                   await tx.tenant.update({ where: { id: mappedId }, data: { ownerId: t.ownerId }});
               }
            }
      
            await insert(tx.customer, payload.customers);
            await insert(tx.lead, payload.leads);
            await insert(tx.task, payload.tasks);
            await insert(tx.chatConversation, payload.chatConversation);
            await insert(tx.chatParticipant, payload.chatParticipant);
            await insert(tx.chatMessage, payload.chatMessage);
            await insert(tx.communicationAttachment, payload.communicationAttachment);
            await insert(tx.mailThread, payload.mailThread);
            await insert(tx.mailRecipient, payload.mailRecipient);
            await insert(tx.mailMessage, payload.mailMessage);
            await insert(tx.callLog, payload.callLog);
            await insert(tx.incident, payload.incidents);
            // Ignore audit logs from backup to avoid overwriting immutable triggers
          }, { maxWait: 10000, timeout: 300000 } as any);
      
          await executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => tx.recoveryJob.update({
            where: { id: jobId },
            data: { status: 'COMPLETED', completedAt: new Date(), checksum: calculatedChecksum }
          }));

          resolve({ success: true, mode, targetTenantId });
        } catch(e) {
          reject(e);
        }
      })
      .on('error', reject);
  });
}
