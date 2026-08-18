import { redis } from '../../../lib/cache/redis.client';
import prisma from '../../../../database/utils/prisma';
import { SecurityEventService } from '../../security-events/security-event.service';
import { checkPermissionFast } from '../../../lib/auth';

export enum SecurityLevel {
  LEVEL_1_INTERNAL = 'LEVEL_1_INTERNAL',
  LEVEL_2_PII = 'LEVEL_2_PII',
  LEVEL_3_FINANCIAL_SECURITY = 'LEVEL_3_FINANCIAL_SECURITY',
}

export class FieldSecurityService {
  /**
   * Static fallback field classification registry. Maps Model -> Field -> SecurityLevel
   */
  private static fallbackClassification: Record<string, Record<string, SecurityLevel>> = {
    User: { phone: SecurityLevel.LEVEL_2_PII },
    Customer: { phone: SecurityLevel.LEVEL_2_PII, email: SecurityLevel.LEVEL_2_PII },
    CustomerContact: { email: SecurityLevel.LEVEL_2_PII, phone: SecurityLevel.LEVEL_2_PII },
    CameraCredential: { username: SecurityLevel.LEVEL_3_FINANCIAL_SECURITY, password: SecurityLevel.LEVEL_3_FINANCIAL_SECURITY },
    PriceBookEntry: { unitPrice: SecurityLevel.LEVEL_3_FINANCIAL_SECURITY },
    DiscountRule: { maxDiscount: SecurityLevel.LEVEL_3_FINANCIAL_SECURITY, minMargin: SecurityLevel.LEVEL_3_FINANCIAL_SECURITY, approvalThreshold: SecurityLevel.LEVEL_3_FINANCIAL_SECURITY },
    QuoteLineItem: { discount: SecurityLevel.LEVEL_3_FINANCIAL_SECURITY, subtotal: SecurityLevel.LEVEL_3_FINANCIAL_SECURITY },
    SalesQuota: { targetAmount: SecurityLevel.LEVEL_3_FINANCIAL_SECURITY },
    DealSnapshot: { value: SecurityLevel.LEVEL_3_FINANCIAL_SECURITY }
  };

  /**
   * Fetches the security level for a field, prioritizing dynamic tenant policies over static fallbacks.
   */
  static async getSecurityLevel(modelName: string, fieldName: string, tenantId: string | null): Promise<SecurityLevel | null> {
    if (tenantId) {
      const cacheKey = `fls:${tenantId}:${modelName}:${fieldName}`;
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) return cached as SecurityLevel;
      }

      const policy = await prisma.fieldSecurityPolicy.findUnique({
        where: { tenantId_modelName_fieldName: { tenantId, modelName, fieldName } }
      });

      if (policy) {
        if (redis) await redis.set(cacheKey, policy.securityLevel, { ex: 3600 });
        return policy.securityLevel as SecurityLevel;
      }
    }

    // Static fallback
    const staticLevel = this.fallbackClassification[modelName]?.[fieldName];
    return staticLevel || null;
  }

  static async requiresEncryption(modelName: string, fieldName: string, tenantId: string | null = null): Promise<boolean> {
    const level = await this.getSecurityLevel(modelName, fieldName, tenantId);
    return level === SecurityLevel.LEVEL_2_PII || level === SecurityLevel.LEVEL_3_FINANCIAL_SECURITY;
  }

  static async canAccessRawField(user: any | null, modelName: string, fieldName: string, tenantId: string | null = null): Promise<boolean> {
    const level = await this.getSecurityLevel(modelName, fieldName, tenantId);
    if (!level) return true;
    if (!user) return false;

    // Fast check: Is Admin?
    const isAdmin = user.email?.includes('admin') || user.isAdmin === true || 
      (user.userRoles?.some((ur: any) => ur.role?.name === 'TENANT_ADMIN' || ur.role?.name === 'GLOBAL_ADMIN'));
    
    if (isAdmin) return true;

    // Check custom roles if needed (in a real system we would check field-level READ permissions)
    return false;
  }

  static secureFinancialField(value: number | null, fieldName: string): number | null {
    if (value === null) return null;
    return 0; 
  }

  static maskField(value: string | null, fieldName: string): string | null {
    if (!value) return value;
    if (fieldName.toLowerCase().includes('email')) {
      const parts = value.split('@');
      if (parts.length === 2) {
        return `${parts[0].charAt(0)}***@${parts[1]}`;
      }
      return '***@***';
    }
    if (fieldName.toLowerCase().includes('phone')) {
      if (value.length > 4) {
        return '*'.repeat(value.length - 4) + value.slice(-4);
      }
      return '****';
    }
    return '********';
  }

  static async maskFields(tenantId: string, userId: string, modelName: string, data: any): Promise<any> {
    if (!data) return data;
    const result = { ...data };
    for (const key of Object.keys(result)) {
      if (typeof result[key] === 'string') {
        const canAccess = await this.canAccessRawField({ id: userId }, modelName, key, tenantId);
        if (!canAccess) {
          result[key] = this.maskField(result[key], key);
        }
      }
    }
    return result;
  }

  // --- ADMINISTRATION METHODS ---

  static async updatePolicy(tenantId: string, adminUserId: string, modelName: string, fieldName: string, securityLevel: string) {
    // 1. Authorization
    const isAdmin = await checkPermissionFast(adminUserId, 'SYSTEM', 'UPDATE');
    if (!isAdmin) {
      await SecurityEventService.logEvent(tenantId, {
        eventType: 'SUSPICIOUS_ACTIVITY', severity: 'CRITICAL', source: 'FieldSecurityService', metadata: { modelName, fieldName }
      }, 'USER', adminUserId);
      throw new Error('Forbidden: Only admins can manage FLS policies');
    }

    // 2. Mutation
    const policy = await prisma.fieldSecurityPolicy.upsert({
      where: { tenantId_modelName_fieldName: { tenantId, modelName, fieldName } },
      update: { securityLevel },
      create: { tenantId, modelName, fieldName, securityLevel }
    });

    // 3. Cache Invalidation
    if (redis) await redis.del(`fls:${tenantId}:${modelName}:${fieldName}`);

    // 4. Audit Log
    await prisma.auditLog.create({
      data: {
        tenantId, actorId: adminUserId, actorType: 'USER', action: 'UPDATE_FLS',
        resource: 'SYSTEM', resourceId: policy.id,
        metadata: { modelName, fieldName, securityLevel }
      }
    });

    return policy;
  }
}
