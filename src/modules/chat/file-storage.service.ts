import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { verifyConversationAccess } from './chat.permissions';

export class FileStorageService {
  /**
   * Prepares a message attachment upload by verifying permissions and generating 
   * the required database entity before passing off to the storage provider (S3/R2).
   */
  static async prepareMessageAttachment(conversationId: string, fileName: string, mimeType: string, sizeBytes: number) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    // 1. Verify access
    await verifyConversationAccess(tenantId, user.id, conversationId);

    // 2. Mock generating a presigned URL or storage key (Implementation depends on provider)
    const storageKey = `chat/${tenantId}/${conversationId}/${Date.now()}-${fileName}`;

    // 3. Return metadata necessary for client to upload
    return {
      storageKey,
      uploadUrl: `mock-presigned-url-for-${storageKey}`,
      mimeType,
      fileName
    };
  }

  /**
   * Called by the client after successful upload to finalize the attachment 
   * and link it to a specific message.
   */
  static async finalizeAttachment(messageId: string, storageKey: string, mimeType: string, metadata?: any) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    const prisma = withTenant(tenantId);

    const message = await prisma.message.findUnique({
      where: { id: messageId, tenantId }
    });

    if (!message) throw new Error("Message not found");
    if (message.senderId !== user.id) throw new Error("Unauthorized to attach file to this message");

    const attachment = await prisma.messageAttachment.create({
      data: {
        tenantId,
        messageId,
        storageKey,
        mimeType,
        metadata: metadata || {}
      }
    });

    return attachment;
  }
}
