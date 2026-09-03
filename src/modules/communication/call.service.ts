import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '../../../database/utils/prisma';
import { CallProvider, CallStatus } from '@prisma/client';

export class CallService {
  /**
   * Log a completed or missed call
   */
  static async logCall(
    tenantId: string, 
    userId: string, 
    callerEmployeeId: string, 
    receiverEmployeeId: string, 
    status: CallStatus,
    duration?: number,
    provider: CallProvider = 'INTERNAL',
    providerCallId?: string
  ) {
    const callLog = await withTenant(tenantId).callLog.create({
      data: {
        tenantId,
        callerEmployeeId,
        receiverEmployeeId,
        status,
        duration,
        provider,
        providerCallId
      }
    });

    await withTenant(tenantId).auditLog.create({
      data: {
        tenantId,
        actorId: userId, actorType: 'USER',
        action: 'CALL_LOG_CREATED',
        resource: 'COMMUNICATION',
        resourceId: callLog.id,
        metadata: { callerEmployeeId, receiverEmployeeId, status }
      }
    });

    return callLog;
  }

  /**
   * Retrieve call logs for a user (either caller or receiver)
   */
  static async getCallLogs(tenantId: string, employeeId: string, cursor?: string, take: number = 50) {
    return await withTenant(tenantId).callLog.findMany({
      where: {
        tenantId,
        OR: [
          { callerEmployeeId: employeeId },
          { receiverEmployeeId: employeeId }
        ]
      },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' }
    });
  }
}
