import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import crypto from 'crypto';

describe('S15.2 FND-15-05: Rate Limiter Audit Remediation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('STRONG: Global rate-limit audit can persist with userId=null and tenantId=SYSTEM', async () => {
    const eventId = crypto.randomUUID();
    
    // Attempt to create a security event with tenantId = 'SYSTEM' and userId = null
    const result = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.securityEvent.create({
        data: {
          id: eventId,
          tenantId: 'SYSTEM', // Relies on the SYSTEM tenant bootstrap
          userId: null,       // Global event has no associated user
          eventType: 'RATE_LIMIT_TRIGGERED',
          severity: 'HIGH',
          source: 'Global IP lockout triggered',
          ipAddress: '127.0.0.1',
          userAgent: 'N/A'
        }
      });
    });

    expect(result.id).toBe(eventId);
    expect(result.tenantId).toBe('SYSTEM');
    expect(result.userId).toBeNull();
  });

  it('STRONG: Account rate-limit audit can persist with real User UUID and Tenant UUID', async () => {
    // Note: This relies on valid foreign keys in a real DB or mocked Prisma.
    // In our test environment, executeAsSystem connects to the test DB.
    
    // First create a temporary tenant and user to test FK constraints
    const tenantId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    
    const result = await executeAsSystem(SystemOperation.AUTH_BOOTSTRAP, async (tx) => {
      await tx.tenant.create({
        data: { id: tenantId, name: 'Audit Test Tenant', status: 'ACTIVE' }
      });
      
      await tx.user.create({
        data: {
          id: userId,
          email: `audit.test.${Date.now()}@example.com`,
          passwordHash: 'dummy',
          status: 'ACTIVE',
          onboardingStatus: 'COMPLETED',
          tenantId
        }
      });

      return tx.securityEvent.create({
        data: {
          tenantId: tenantId,
          userId: userId,
          eventType: 'RATE_LIMIT_TRIGGERED',
          severity: 'MEDIUM',
          source: 'Login lockout triggered',
          ipAddress: '127.0.0.2',
          userAgent: 'N/A'
        }
      });
    });

    expect(result.tenantId).toBe(tenantId);
    expect(result.userId).toBe(userId);
  });
});
