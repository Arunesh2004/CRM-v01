'use server';
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Resource, Action } from '@prisma/client';
import { CallSessionService } from '../call-session.service';

async function _getCallsAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.COMMUNICATION, Action.READ);

    const prisma = withTenant(tenantId);
    
    const calls = await prisma.callLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: calls };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getCallsAction = withServerActionContext(_getCallsAction);

async function _initiateCallAction(recipientId: string) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();
    await requirePermission(Resource.COMMUNICATION, Action.CREATE);

    const session = await CallSessionService.initiateCall(tenantId, user.id, recipientId);
    return { success: true, data: session };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _acceptCallAction(callId: string, version: number) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();

    await CallSessionService.acceptCall(tenantId, user.id, callId, version);
    return { success: true };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _rejectCallAction(callId: string, version: number) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();

    await CallSessionService.rejectCall(tenantId, user.id, callId, version);
    return { success: true };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _markConnectedAction(callId: string, version: number) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();

    await CallSessionService.markConnected(tenantId, user.id, callId, version);
    return { success: true };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _endCallAction(callId: string, version: number) {
  try {
    const tenantId = await requireTenant();
    const user = await requireAuth();

    await CallSessionService.endCall(tenantId, user.id, callId, version);
    return { success: true };
  } catch (errorRaw: unknown) {
    const error = errorRaw instanceof Error ? errorRaw : new Error(String(errorRaw));
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const initiateCallAction = withServerActionContext(_initiateCallAction);
export const acceptCallAction = withServerActionContext(_acceptCallAction);
export const rejectCallAction = withServerActionContext(_rejectCallAction);
export const markConnectedAction = withServerActionContext(_markConnectedAction);
export const endCallAction = withServerActionContext(_endCallAction);
