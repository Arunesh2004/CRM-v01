import { withTenant } from '@/../database/utils/prisma-tenant';

export async function verifyConversationAccess(tenantId: string, userId: string, conversationId: string) {
  const prisma = withTenant(tenantId);
  
  const membership = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId
      }
    }
  });

  if (!membership) {
    throw new Error('Access denied: User is not a member of this conversation.');
  }

  return membership;
}
