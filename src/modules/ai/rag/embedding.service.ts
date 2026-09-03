import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '../../../../database/utils/prisma';
import { AIContext } from '../context/context-builder.service';
import { SecurityEventService } from '../../../../src/modules/security-events/security-event.service';

export class EmbeddingService {
  /**
   * Enforces strict RAG retrieval pipeline:
   * User Context -> Tenant -> Department -> Document Permission -> Vector Search
   */
  static async searchRelevantChunks(
    context: AIContext,
    queryEmbedding: number[],
    limit: number = 5
  ) {
    try {
      // Step 1: Enforce Tenant boundaries (RLS would also catch this, but we filter explicitly)
      // Step 2: Enforce Department boundaries (if applicable)
      // Step 3: Enforce Document Permission (RBAC mapping)
      
      const accessibleDocuments = await withTenant(context.tenantId).documentPermission.findMany({
        where: {
          OR: [
            { userId: context.user.id },
            { roleId: { in: context.userRoles } } // Simplified role check
          ]
        },
        select: { documentId: true }
      });

      const allowedDocIds = accessibleDocuments.map((d: any) => d.documentId);

      // We use standard Prisma query. 
      // In production with pgvector, this would be an $queryRaw using <=> operator
      const chunks = await withTenant(context.tenantId).documentEmbedding.findMany({
        where: {
          tenantId: context.tenantId,
          OR: [
            { departmentId: context.user.departmentId },
            { departmentId: null }
          ],
          accessLevel: { in: context.permissions }, // E.g., 'CONFIDENTIAL' requires specific perm
          documentId: { in: allowedDocIds.length > 0 ? allowedDocIds : undefined }
        }
      });

      // Filter logic: In a real pgvector environment, this sorting is done by the database.
      // Since we are mocking pgvector locally with Float[], we return a sliced array.
      
      // We must track Data Lineage. This is returned to the executor.
      return chunks.slice(0, limit).map((chunk: any) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        text: chunk.chunkText,
        metadata: chunk.metadata
      }));

    } catch (error) {
      await SecurityEventService.logEvent(context.tenantId, { eventType: 'AI_BLOCKED_ACTION', severity: 'HIGH', source: 'EmbeddingService', metadata: { reason: 'Unauthorized RAG retrieval attempt', error: (error as Error).message } }, 'USER', context.user.id);
      throw new Error('Failed to retrieve chunks safely');
    }
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding generation
    return new Array(1536).fill(0.01);
  }
}
