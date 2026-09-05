import { withTenant } from '@db/utils/prisma-tenant';
import { AIContext } from '../context/context-builder.service';
import { SecurityEventService } from '../../../../src/modules/security-events/security-event.service';

export class EmbeddingService {
  /**
   * Enforces strict RAG retrieval pipeline matching authoritative CRM Document rules.
   * Candidate Generation + Authorization Filtering combined safely in a single DB query.
   */
  static async searchRelevantChunks(
    context: AIContext,
    queryEmbedding: number[],
    limit: number = 5
  ) {
    if (!context || !context.tenantId || !context.user?.id || !Object.isFrozen(context)) {
      throw new Error('Missing or forged trusted AIContext');
    }

    try {
      // Authoritative evaluation based on AIContext
      const hasCustomerRead = context.permissions.includes('CUSTOMER:READ') || context.permissions.includes('CUSTOMER:UPDATE');
      const hasTaskRead = context.permissions.includes('TASK:READ') || context.permissions.includes('TASK:UPDATE');

      // Set-based Prisma predicate mapping strictly to `document.service.ts` requireDocumentAccess semantics
      const chunks = await withTenant(context.tenantId).documentEmbedding.findMany({
        where: {
          tenantId: context.tenantId, // Always hardcoded to Context Tenant
          document: {
            OR: [
              // 1. Explicit owner
              { uploadedById: context.user.id },
              // 2. Explicit permission
              { documentPermissions: { some: { userId: context.user.id, permission: { in: ['READ', 'WRITE', 'DELETE'] } } } },
              // 3. Inherited CUSTOMER permission
              ...(hasCustomerRead ? [{ customerId: { not: null } }] : []),
              // 4. Inherited TASK permission
              ...(hasTaskRead ? [{ taskId: { not: null } }] : [])
            ]
          }
        }
      });

      // Semantic Search: mocked by slicing the result (as instructed, do not convert to pgvector)
      const semanticResults = chunks.slice(0, limit);

      // Output Minimization: Return strictly what the provider needs, stripping internal Prisma metadata
      return semanticResults.map((chunk: any) => ({
        id: chunk.id,
        text: chunk.chunkText
        // documentId and metadata are stripped to minimize exposure
      }));

    } catch (error) {
      await SecurityEventService.logEvent(
        context.tenantId,
        {
          eventType: 'AI_BLOCKED_ACTION',
          severity: 'HIGH',
          source: 'EmbeddingService',
          metadata: { reason: 'Unauthorized RAG retrieval attempt', error: (error as Error).message }
        },
        'USER',
        context.user.id
      );
      throw new Error('Failed to retrieve chunks safely');
    }
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding generation
    return new Array(1536).fill(0.01);
  }
}
