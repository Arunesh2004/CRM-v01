'use server';
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
    return { success: false, error: error.message };
  }
}

export async function getCallHistoryAction() {
  try {
    await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('COMMUNICATION', 'READ');
    
    const prisma = withTenant(tenantId);
    const calls = await prisma.call.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: calls };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
