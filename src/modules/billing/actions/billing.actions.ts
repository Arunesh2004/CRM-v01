'use server';
import { withServerActionContext } from '@/lib/observability/server-action';

import { sanitizeClientError } from '@/lib/errors/client-safe-error';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';
import { BillingService } from '../billing.service';

async function _getSubscriptionAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.REVENUE, Action.READ);

    const subscription = await BillingService.getSubscription(tenantId);
    return { success: true, data: subscription };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getPlansAction() {
  try {
    // Plans don't necessarily require REVENUE:READ but we can enforce auth
    await requireAuth();
    const plans = BillingService.getAvailablePlans();
    return { success: true, data: plans };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getUsageAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.REVENUE, Action.READ);

    const usage = await BillingService.getTenantUsage(tenantId);
    return { success: true, data: usage };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getInvoicesAction() {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.REVENUE, Action.READ);

    const invoices = await BillingService.getInvoices(tenantId);
    return { success: true, data: invoices };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _upgradeSubscriptionAction(planId: string) {
  try {
    const tenantId = await requireTenant();
    await requireAuth();
    await requirePermission(Resource.REVENUE, Action.UPDATE);

    const subscription = await BillingService.upgradeSubscription(tenantId, planId);
    return { success: true, data: subscription };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const getSubscriptionAction = withServerActionContext(_getSubscriptionAction);

export const getPlansAction = withServerActionContext(_getPlansAction);

export const getUsageAction = withServerActionContext(_getUsageAction);

export const getInvoicesAction = withServerActionContext(_getInvoicesAction);

export const upgradeSubscriptionAction = withServerActionContext(_upgradeSubscriptionAction);
