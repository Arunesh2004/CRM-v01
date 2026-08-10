import { withTenant } from '@/../database/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function getPipelines() {
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  await requirePermission('USER', 'READ'); // Basic access

  return await prisma.pipeline.findMany({
    where: { tenantId },
    include: {
      stages: {
        orderBy: { order: 'asc' }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
}

export async function createPipeline(data: { name: string; description?: string }) {
  await requireAuth();
  const tenantId = await requireTenant();
  // Only admins or managers should create pipelines
  await requirePermission('SYSTEM', 'UPDATE');

  const prisma = withTenant(tenantId);
  
  // Check if it's the first pipeline
  const count = await prisma.pipeline.count({ where: { tenantId } });
  
  return await prisma.pipeline.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description,
      isDefault: count === 0
    },
    include: { stages: true }
  });
}

export async function createPipelineStage(pipelineId: string, data: { name: string; probability: number; color?: string; isClosedWon?: boolean; isClosedLost?: boolean }) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('SYSTEM', 'UPDATE');

  const prisma = withTenant(tenantId);
  
  const pipeline = await prisma.pipeline.findFirst({ where: { id: pipelineId, tenantId } });
  if (!pipeline) throw new Error('Pipeline not found');

  const lastStage = await prisma.pipelineStage.findFirst({
    where: { pipelineId, tenantId },
    orderBy: { order: 'desc' }
  });

  const nextOrder = lastStage ? lastStage.order + 1 : 1;

  return await prisma.pipelineStage.create({
    data: {
      tenantId,
      pipelineId,
      name: data.name,
      probability: data.probability,
      order: nextOrder,
      color: data.color,
      isClosedWon: data.isClosedWon || false,
      isClosedLost: data.isClosedLost || false,
    }
  });
}

/**
 * Idempotent seeder run during tenant creation.
 */
export async function seedDefaultPipeline(tenantId: string) {
  const prisma = withTenant(tenantId);
  
  const existing = await prisma.pipeline.findFirst({
    where: { tenantId, name: 'Standard Sales' }
  });

  if (existing) return existing;

  return await prisma.pipeline.create({
    data: {
      tenantId,
      name: 'Standard Sales',
      description: 'Default sales pipeline',
      isDefault: true,
      stages: {
        create: [
          { tenantId, name: 'New', probability: 10, order: 1, color: '#3b82f6' },
          { tenantId, name: 'Qualification', probability: 30, order: 2, color: '#8b5cf6' },
          { tenantId, name: 'Proposal', probability: 60, order: 3, color: '#f59e0b' },
          { tenantId, name: 'Negotiation', probability: 80, order: 4, color: '#f97316' },
          { tenantId, name: 'Closed Won', probability: 100, order: 5, color: '#10b981', isClosedWon: true },
          { tenantId, name: 'Closed Lost', probability: 0, order: 6, color: '#ef4444', isClosedLost: true },
        ]
      }
    },
    include: { stages: { orderBy: { order: 'asc' } } }
  });
}
