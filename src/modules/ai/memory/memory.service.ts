import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '../../../../database/utils/prisma';
import { AIContext } from '../context/context-builder.service';
import { SecurityEventService } from '../../../../src/modules/security-events/security-event.service';
import { AIMemoryType, AIMemoryVisibility } from '@prisma/client';

export class AIMemoryService {
  /**
   * Safe Memory Ingestion Flow
   * Input -> Validation -> Permission Check -> Storage
   */
  static async storeMemory(
    context: AIContext,
    content: string,
    type: AIMemoryType,
    visibility: AIMemoryVisibility,
    source: string
  ) {
    try {
      // 1. Validation
      if (!content || content.length < 5) {
        throw new Error('Memory content too short');
      }

      // 2. Permission Check
      if (visibility === 'TENANT' && !context.permissions.includes('MEMORY:SHARE_TENANT')) {
        throw new Error('Unauthorized to create tenant-wide memory');
      }
      if (visibility === 'DEPARTMENT' && !context.permissions.includes('MEMORY:SHARE_DEPARTMENT')) {
        throw new Error('Unauthorized to create department-wide memory');
      }

      // 3. Storage
      const memory = await withTenant(context.tenantId).aIMemory.create({
        data: {
          tenantId: context.tenantId,
          userId: context.user.id,
          content,
          type,
          visibility,
          source,
          verified: false, // Must be explicitly verified later if needed
        }
      });

      return memory;
    } catch (error) {
      await SecurityEventService.logEvent(context.tenantId, { eventType: 'SUSPICIOUS_ACTIVITY', severity: 'MEDIUM', source: 'AIMemoryService', metadata: { reason: 'Memory poisoning attempt or invalid memory', error: (error as Error).message } }, 'USER', context.user.id);
      throw error;
    }
  }

  static async retrieveRelevantMemories(context: AIContext, query: string) {
    if (!context || !context.tenantId || !context.user?.id || !Object.isFrozen(context)) {
      throw new Error('Missing or forged trusted AIContext');
    }

    // Return memories the user is allowed to see
    const memories = await withTenant(context.tenantId).aIMemory.findMany({
      where: {
        tenantId: context.tenantId, // Always hardcoded to Context Tenant
        OR: [
          { visibility: 'TENANT' },
          { visibility: 'DEPARTMENT', user: { departmentId: context.user.departmentId } },
          { visibility: 'PRIVATE_USER', userId: context.user.id }
        ],
        // Exclude expired memories
        AND: [
          { OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ] }
        ]
      },
      orderBy: {
        importanceScore: 'desc'
      },
      take: 10
    });

    // Output Minimization: Return strictly what the provider needs, stripping internal Prisma metadata
    return memories.map((memory: any) => ({
      id: memory.id,
      content: memory.content,
      type: memory.type,
      visibility: memory.visibility,
      source: memory.source
    }));
  }
}
