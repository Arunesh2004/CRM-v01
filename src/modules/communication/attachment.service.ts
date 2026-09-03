import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '../../../database/utils/prisma';
import { AttachmentType } from '@prisma/client';

export class AttachmentService {
  /**
   * Register a new attachment in the database (file upload assumed handled externally)
   */
  static async registerAttachment(
    tenantId: string,
    uploaderId: string,
    attachedToType: AttachmentType,
    attachedToId: string,
    fileName: string,
    fileType: string,
    storageUrl: string,
    size: number
  ) {
    const attachment = await withTenant(tenantId).communicationAttachment.create({
      data: {
        tenantId,
        uploaderId,
        attachedToType,
        attachedToId,
        fileName,
        fileType,
        storageUrl,
        size
      }
    });

    return attachment;
  }

  /**
   * Get attachments for a specific communication object
   */
  static async getAttachments(tenantId: string, attachedToType: AttachmentType, attachedToId: string) {
    return await withTenant(tenantId).communicationAttachment.findMany({
      where: {
        tenantId,
        attachedToType,
        attachedToId
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}
