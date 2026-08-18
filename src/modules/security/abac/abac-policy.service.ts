import prisma from '../../../../database/utils/prisma';
import { SecurityEventService } from '../../security-events/security-event.service';
import { checkPermissionFast } from '../../../lib/auth';
import { redis } from '../../../lib/cache/redis.client';
import { Action, Resource } from '@prisma/client';

export class ABACPolicyService {
  /**
   * Evaluates all ABAC policies for a given tenant, resource, and action.
   * This can be used by services to determine if an action is permitted based on attributes.
   */
  static async evaluatePolicies(tenantId: string, resource: string, action: string, context: Record<string, any>): Promise<'ALLOW' | 'DENY' | 'NEUTRAL'> {
    const cacheKey = `abac:${tenantId}:${resource}:${action}`;
    let policies: any[] = [];

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) policies = typeof cached === 'string' ? JSON.parse(cached) : cached;
    }

    if (!policies.length) {
      policies = await prisma.aBACPolicy.findMany({
        where: { tenantId, resource, action, isActive: true }
      });
      if (redis) await redis.set(cacheKey, JSON.stringify(policies), { ex: 3600 });
    }

    if (policies.length === 0) return 'NEUTRAL';

    // Simple evaluation engine
    // A DENY policy overrides everything.
    let allowed = false;
    for (const policy of policies) {
      const conditions = policy.conditions as Record<string, any>;
      let match = true;

      for (const [key, expectedValue] of Object.keys(conditions).map(k => [k, conditions[k]])) {
        // e.g. { "deal.amount": { "lt": 10000 } }
        // For prototype, we do simple exact match or basic operators
        const actualValue = context[key];
        if (typeof expectedValue === 'object' && expectedValue !== null) {
          if (expectedValue.lt !== undefined && !(actualValue < expectedValue.lt)) match = false;
          if (expectedValue.gt !== undefined && !(actualValue > expectedValue.gt)) match = false;
        } else {
          if (actualValue !== expectedValue) match = false;
        }
      }

      if (match) {
        if (policy.effect === 'DENY') return 'DENY';
        if (policy.effect === 'ALLOW') allowed = true;
      }
    }

    return allowed ? 'ALLOW' : 'NEUTRAL';
  }

  static async createPolicy(tenantId: string, adminId: string, name: string, resource: string, action: string, conditions: any, effect: 'ALLOW' | 'DENY') {
    // 1. Authorization
    const isAdmin = await checkPermissionFast(adminId, 'SYSTEM' as Resource, 'UPDATE' as Action);
    if (!isAdmin) {
      await SecurityEventService.logEvent(tenantId, {
        eventType: 'SUSPICIOUS_ACTIVITY', severity: 'HIGH', source: 'ABACPolicyService', metadata: { name, resource, action }
      }, 'USER', adminId);
      throw new Error('Forbidden: Only admins can manage ABAC policies');
    }

    // 2. Mutation
    const policy = await prisma.aBACPolicy.create({
      data: { tenantId, name, resource, action, conditions, effect }
    });

    // 3. Cache invalidation
    if (redis) await redis.del(`abac:${tenantId}:${resource}:${action}`);

    // 4. Audit
    await prisma.auditLog.create({
      data: {
        tenantId, actorId: adminId, actorType: 'USER', action: 'CREATE_ABAC_POLICY',
        resource: 'SYSTEM', resourceId: policy.id,
        metadata: { name, resource, action, effect }
      }
    });

    return policy;
  }
}
