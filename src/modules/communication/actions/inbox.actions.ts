'use server';
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';

async function _getInboxAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.COMMUNICATION, Action.READ);

    const prisma = withTenant(tenantId);
    
    // Fetch recent emails
    const emails = await prisma.mailMessage.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        sender: { select: { email: true, firstName: true, lastName: true } }
      }
    });

    // Fetch recent SMS/Chats (if we use chatMessage for SMS or internal chat)
    const chats = await prisma.chatMessage.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return { success: true, data: { emails, chats } };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getInboxAction = withServerActionContext(_getInboxAction);
