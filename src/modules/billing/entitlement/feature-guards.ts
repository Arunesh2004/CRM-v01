import { EntitlementEngine, PlanLimits, PlanFeatures } from './entitlement.engine';
import { Logger } from '../../../lib/logger/logger';

export class FeatureGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeatureGuardError';
  }
}

export class UsageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageLimitError';
  }
}

export class SubscriptionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubscriptionStateError';
  }
}

export async function requirePlanFeature(tenantId: string, featureName: keyof PlanFeatures): Promise<void> {
  const entitlement = await EntitlementEngine.getTenantEntitlement(tenantId);
  
  validateSubscriptionState(entitlement);

  if (!entitlement.features[featureName]) {
    Logger.warn(`Access denied: Tenant ${tenantId} does not have feature ${featureName}`);
    throw new FeatureGuardError(`Your current plan does not support ${featureName}. Please upgrade.`);
  }
}

export async function requireUsageLimit(tenantId: string, limitName: keyof PlanLimits, incrementBy: number = 1): Promise<void> {
  const entitlement = await EntitlementEngine.getTenantEntitlement(tenantId);
  
  validateSubscriptionState(entitlement);

  const limit = entitlement.limits[limitName];
  const current = (entitlement.currentUsage[limitName] || 0);

  if (current + incrementBy > limit) {
    Logger.warn(`Usage limit exceeded for ${tenantId}: ${limitName} (Limit: ${limit}, Attempted: ${current + incrementBy})`);
    throw new UsageLimitError(`You have exceeded your plan limit for ${limitName}. Please upgrade to continue.`);
  }

  // Locally update cache to prevent race conditions until async workers true-up the DB
  entitlement.currentUsage[limitName] = current + incrementBy;
  EntitlementEngine.mockSetEntitlement(tenantId, entitlement);
}

function validateSubscriptionState(entitlement: any) {
  if (entitlement.status === 'SUSPENDED') {
    throw new SubscriptionStateError('Your account is suspended. Please contact support.');
  }
  
  if (entitlement.status === 'CANCELLED') {
    throw new SubscriptionStateError('Your subscription is cancelled. Reactivate to use paid features.');
  }

  if (entitlement.status === 'PAST_DUE') {
    // Allows grace period operations
    Logger.warn(`Tenant ${entitlement.tenantId} is PAST_DUE. Operating under grace period.`);
  }
}
