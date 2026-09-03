import { requireTenant, requireAuthIdentity, requirePermissionFast, requireTenantFromIdentity } from '@/lib/auth';
import prisma from '@db/utils/prisma';
import { withTenant } from '@db/utils/prisma-tenant';
import { ProviderFactory } from '../../../infrastructure/provider.factory';
import { StorageProvider } from '../../../infrastructure/storage/storage.interface';
import { Logger } from '@/lib/logger/logger';

export interface CreateDocumentInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
  customerId?: string;
  taskId?: string;
}

export async function requireDocumentAccess(tenantId: string, userId: string, documentId: string, action: 'READ' | 'WRITE' | 'DELETE') {
  const prismaTenant = withTenant(tenantId);
  const document = await prismaTenant.document.findUnique({
    where: { id: documentId }
  });
  if (!document) throw new Error('Document not found');

  if (document.uploadedById === userId) {
    return document;
  }

  // Check explicit document permissions
  const explicitPerm = await prismaTenant.documentPermission.findFirst({
    where: {
      documentId,
      userId,
      permission: { in: action === 'READ' ? ['READ', 'WRITE', 'DELETE'] : action === 'WRITE' ? ['WRITE', 'DELETE'] : ['DELETE'] }
    }
  });
  if (explicitPerm) {
    return document;
  }

  // Check parent CRM resource ownership
  if (document.customerId) {
    const hasPerm = await requirePermissionFast(userId, 'CUSTOMER', action === 'READ' ? 'READ' : 'UPDATE').catch(() => false);
    if (hasPerm) return document;
  } else if (document.taskId) {
    const hasPerm = await requirePermissionFast(userId, 'TASK', action === 'READ' ? 'READ' : 'UPDATE').catch(() => false);
    if (hasPerm) return document;
  }

  throw new Error('Forbidden: Unauthorized document access');
}

export async function createDocument(input: CreateDocumentInput) {
  const identity = await requireAuthIdentity();
  // 1. STAGE 8: FILE SECURITY VALIDATION
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  if (input.sizeBytes > MAX_FILE_SIZE) {
    throw new Error('File exceeds maximum allowed size of 10MB');
  }

  const allowedMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(input.mimeType)) {
    throw new Error('Invalid file type. Only PDF, Word, and common image formats are allowed.');
  }

  const dangerousExtensions = ['.exe', '.dll', '.bat', '.sh', '.js', '.mjs', '.php', '.py', '.rb'];
  const lowerFileName = input.fileName.toLowerCase();
  if (dangerousExtensions.some(ext => lowerFileName.endsWith(ext))) {
    throw new Error('Dangerous file extension detected.');
  }

  const tenantId = await requireTenantFromIdentity(identity);
  
  // Validate parent ownership and authorization
  const prismaTenant = withTenant(tenantId);
  if (input.customerId) {
    const customer = await prismaTenant.customer.findFirst({
      where: { id: input.customerId, tenantId, deletedAt: null },
      select: { id: true }
    });
    if (!customer) throw new Error('Customer not found or unauthorized');
    await requirePermissionFast(identity.id, 'CUSTOMER', 'UPDATE');
  }

  if (input.taskId) {
    const task = await prismaTenant.task.findFirst({
      where: { id: input.taskId, tenantId, deletedAt: null },
      select: { id: true }
    });
    if (!task) throw new Error('Task not found or unauthorized');
    await requirePermissionFast(identity.id, 'TASK', 'UPDATE');
  }

  if (!input.customerId && !input.taskId) {
    throw new Error('Document must belong to a Customer or Task');
  }

  // Upload to storage provider
  const provider = await ProviderFactory.getForTenant('STORAGE') as StorageProvider;
  const storageKey = await provider.upload(input.buffer, input.fileName, input.mimeType, `tenant/${tenantId}/docs/`);

  // Create document metadata
  try {
    const document = await prismaTenant.document.create({
      data: {
        tenantId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey,
        uploadedById: identity.id,
        customerId: input.customerId,
        taskId: input.taskId,
      }
    });
    
    // Log audit
    await prismaTenant.auditLog.create({
      data: {
        tenantId,
        actorId: identity.id,
        actorType: 'USER',
        action: 'CREATE',
        resource: 'DOCUMENT',
        resourceId: document.id,
        metadata: { fileName: input.fileName, sizeBytes: input.sizeBytes, customerId: input.customerId, taskId: input.taskId }
      }
    });

    return document;
  } catch (dbError) {
    Logger.error('Failed to persist document to DB, attempting to cleanup storage', dbError);
    // Best effort cleanup if DB fails
    try {
      await provider.delete(storageKey);
    } catch (cleanupError) {
      Logger.error('Failed to cleanup storage after DB error', cleanupError);
    }
    throw new Error('Failed to save document metadata');
  }
}

export async function getDocument(id: string) {
  const identity = await requireAuthIdentity();
  const tenantId = await requireTenantFromIdentity(identity);
  return await requireDocumentAccess(tenantId, identity.id, id, 'READ');
}

export async function getDocumentsForCustomer(customerId: string) {
  const identity = await requireAuthIdentity();
  const tenantId = await requireTenantFromIdentity(identity);
  await requirePermissionFast(identity.id, 'CUSTOMER', 'READ');
  
  const prismaTenant = withTenant(tenantId);
  return prismaTenant.document.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedById: true,
      uploadedBy: { select: { email: true } }
    }
  });
}

export async function getDocumentsForTask(taskId: string) {
  const identity = await requireAuthIdentity();
  const tenantId = await requireTenantFromIdentity(identity);
  await requirePermissionFast(identity.id, 'TASK', 'READ');

  const prismaTenant = withTenant(tenantId);
  return prismaTenant.document.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
      uploadedById: true,
      uploadedBy: { select: { email: true } }
    }
  });
}

export async function deleteDocument(id: string) {
  const identity = await requireAuthIdentity();
  const tenantId = await requireTenantFromIdentity(identity);

  const document = await requireDocumentAccess(tenantId, identity.id, id, 'DELETE');

  const prismaTenant = withTenant(tenantId);
  // Delete from DB first to ensure CRM consistency
  await prismaTenant.document.delete({
    where: { id }
  });

  // Delete from storage (best effort)
  try {
    const provider = await ProviderFactory.getForTenant('STORAGE') as StorageProvider;
    await provider.delete(document.storageKey);
  } catch (storageError) {
    Logger.error('Failed to delete physical storage for document', document.id, storageError);
  }

  // Audit
  await prismaTenant.auditLog.create({
    data: {
      tenantId,
      actorId: identity.id,
      actorType: 'USER',
      action: 'DELETE',
      resource: 'DOCUMENT',
      resourceId: document.id,
      metadata: { fileName: document.fileName, customerId: document.customerId, taskId: document.taskId }
    }
  });

  return { success: true };
}
