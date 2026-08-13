'use server';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

import { z } from 'zod';
import { CreateCallSchema } from '../validators/call.schema';
import * as telephonyService from '../telephony/telephony.service';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';

export async function createCallAction(payload: z.infer<typeof CreateCallSchema>) {
  try {
    const validatedData = CreateCallSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('COMMUNICATION', 'CREATE');

    const result = await telephonyService.createCall(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export async function getCallHistoryAction(cursor?: string, limit = 50) {
  try {
    await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('COMMUNICATION', 'READ');

    const prisma = withTenant(tenantId);
    const take = Math.min(limit, 100) + 1;

    const calls = await prisma.call.findMany({
      where: { tenantId },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' }
    });

    let nextCursor: string | null = null;
    if (calls.length > Math.min(limit, 100)) {
      const nextItem = calls.pop();
      nextCursor = nextItem?.id || null;
    }

    return { success: true, data: calls, pagination: { nextCursor, hasMore: nextCursor !== null } };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}
