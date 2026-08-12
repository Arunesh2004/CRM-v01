import prisma from '@/../database/utils/prisma';
import { AIConfig } from '@/lib/config/ai.config';
import { Logger } from '@/lib/logger/logger';
import { AIConversationStatus } from '@prisma/client';

export class ConversationRetentionService {
  /**
   * Processes archival of ACTIVE conversations where updatedAt < archiveCutoff.
   */
  static async processArchivalBatch(dryRun: boolean): Promise<number> {
    const archiveAfterDays = AIConfig.ARCHIVE_AFTER_DAYS;
    if (archiveAfterDays <= 0) return 0; // Disabled or misconfigured

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - archiveAfterDays);
    
    // Find candidates bounded by batch size
    const candidates = await prisma.aIConversation.findMany({
      where: {
        status: AIConversationStatus.ACTIVE,
        updatedAt: { lt: cutoffDate }
      },
      select: { id: true, updatedAt: true },
      take: AIConfig.RETENTION_BATCH_SIZE
    });

    if (candidates.length === 0) return 0;
    if (dryRun) return candidates.length;

    let archivedCount = 0;
    // Update conditionally
    for (const candidate of candidates) {
      const updateRes = await prisma.aIConversation.updateMany({
        where: {
          id: candidate.id,
          status: AIConversationStatus.ACTIVE,
          updatedAt: candidate.updatedAt // Strict concurrency check
        },
        data: {
          status: AIConversationStatus.ARCHIVED,
          archivedAt: new Date()
        }
      });
      archivedCount += updateRes.count;
    }

    return archivedCount;
  }

  /**
   * Processes permanent deletion of ARCHIVED conversations where archivedAt < retentionCutoff.
   */
  static async processDeletionBatch(dryRun: boolean): Promise<number> {
    const retentionDays = AIConfig.RETENTION_DAYS;
    if (retentionDays <= 0) return 0; // Guard against unsafe config

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const candidates = await prisma.aIConversation.findMany({
      where: {
        status: AIConversationStatus.ARCHIVED,
        archivedAt: { lt: cutoffDate }
      },
      select: { id: true },
      take: AIConfig.RETENTION_BATCH_SIZE
    });

    if (candidates.length === 0) return 0;
    if (dryRun) return candidates.length;

    let deletedCount = 0;
    // Bulk delete using conditionally bounded limits if possible, or individually with checks
    for (const candidate of candidates) {
      const delRes = await prisma.aIConversation.deleteMany({
        where: {
          id: candidate.id,
          status: AIConversationStatus.ARCHIVED,
          archivedAt: { lt: cutoffDate } // strict recheck
        }
      });
      deletedCount += delRes.count;
    }

    return deletedCount;
  }

  /**
   * Orchestrates the full retention cycle.
   */
  static async runRetentionCycle(dryRun: boolean = AIConfig.RETENTION_DRY_RUN): Promise<{ archived: number, deleted: number, dryRun: boolean }> {
    Logger.info('AI Retention Cycle Started', { event: 'AI_RETENTION_STARTED' });
    const start = Date.now();
    let totalArchived = 0;
    let totalDeleted = 0;
    
    // Process Archival
    for (let i = 0; i < AIConfig.RETENTION_MAX_BATCHES_PER_RUN; i++) {
      const count = await this.processArchivalBatch(dryRun);
      totalArchived += count;
      if (count < AIConfig.RETENTION_BATCH_SIZE) break; // Exhausted candidates
    }

    // Process Deletion
    for (let i = 0; i < AIConfig.RETENTION_MAX_BATCHES_PER_RUN; i++) {
      const count = await this.processDeletionBatch(dryRun);
      totalDeleted += count;
      if (count < AIConfig.RETENTION_BATCH_SIZE) break; // Exhausted candidates
    }

    const durationMs = Date.now() - start;
    Logger.info('AI Retention Cycle Completed', {
      event: 'AI_RETENTION_COMPLETED',
      durationMs,
      archivedCount: totalArchived,
      deletedCount: totalDeleted,
      dryRun
    });

    return { archived: totalArchived, deleted: totalDeleted, dryRun };
  }
}
