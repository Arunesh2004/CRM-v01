import { requireTenant, requireAuthIdentity, requirePermissionFast, requireTenantFromIdentity } from '@/lib/auth';
import prisma from '@/../database/utils/prisma';
import { ProviderFactory } from '../../../infrastructure/provider.factory';
import { StorageProvider } from '../../../infrastructure/storage/storage.interface';

export interface CreateDocumentInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
  customerId?: string;
  taskId?: string;
}

export async function createDocument(input: CreateDocumentInput) {
  const identity = await requireAuthIdentity();
  const tenantId = await requireTenantFromIdentity(identity);
  
  // Validate parent ownership and authorization
  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, tenantId, deletedAt: null },
      select: { id: true }
    });
    if (!customer) throw new Error('Customer not found or unauthorized');
    await requirePermissionFast(identity.id, 'CUSTOMER', 'UPDATE');
  }

  if (input.taskId) {
    const task = await prisma.task.findFirst({
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
    const document = await prisma.document.create({
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
    await prisma.auditLog.create({
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
    console.error('Failed to persist document to DB, attempting to cleanup storage', dbError);
    // Best effort cleanup if DB fails
    try {
      await provider.delete(storageKey);
    } catch (cleanupError) {
      console.error('Failed to cleanup storage after DB error', cleanupError);
    }
    throw new Error('Failed to save document metadata');
  }
}

export async function getDocument(id: string) {
  const tenantId = await requireTenant();
  const document = await prisma.document.findFirst({
    where: { id, tenantId }
  });
  if (!document) throw new Error('Document not found');
  return document;
}

export async function getDocumentsForCustomer(customerId: string) {
  const tenantId = await requireTenant();
  return prisma.document.findMany({
    where: { tenantId, customerId },
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
  const tenantId = await requireTenant();
  return prisma.document.findMany({
    where: { tenantId, taskId },
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

  const document = await prisma.document.findFirst({
    where: { id, tenantId }
  });
  if (!document) throw new Error('Document not found');

  // Verify permission
  // For MVP, just require UPDATE on the parent CRM resource, or the user is the uploader
  if (document.uploadedById !== identity.id) {
    if (document.customerId) {
      await requirePermissionFast(identity.id, 'CUSTOMER', 'UPDATE');
    } else if (document.taskId) {
      await requirePermissionFast(identity.id, 'TASK', 'UPDATE');
    }
  }

  // Delete from DB first to ensure CRM consistency
  await prisma.document.delete({
    where: { id }
  });

  // Delete from storage (best effort)
  try {
    const provider = await ProviderFactory.getForTenant('STORAGE') as StorageProvider;
    await provider.delete(document.storageKey);
  } catch (storageError) {
    console.error('Failed to delete physical storage for document', document.id, storageError);
  }

  // Audit
  await prisma.auditLog.create({
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
