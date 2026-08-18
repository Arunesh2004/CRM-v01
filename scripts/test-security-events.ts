import globalPrisma from '../database/utils/prisma';
import { SecurityEventService } from '../src/modules/security-events/security-event.service';
import * as crypto from 'crypto';
import { SecurityEventSeverity } from '@prisma/client';

async function runTests() {
  console.log('--- Starting Security Event Module Tests ---\n');

  const tenantA = 'tenant-A-' + crypto.randomUUID();
  const tenantB = 'tenant-B-' + crypto.randomUUID();

  // Setup Tenants and Users
  await globalPrisma.tenant.createMany({
    data: [
      { id: tenantA, name: 'Tenant A' },
      { id: tenantB, name: 'Tenant B' }
    ]
  });

  const adminA = crypto.randomUUID();
  const employeeA = crypto.randomUUID();
  const adminB = crypto.randomUUID();

  await globalPrisma.user.createMany({
    data: [
      { id: adminA, email: 'admin@t.com', tenantId: tenantA, status: 'ACTIVE' },
      { id: employeeA, email: 'emp@t.com', tenantId: tenantA, status: 'ACTIVE' },
      { id: adminB, email: 'adminb@t.com', tenantId: tenantB, status: 'ACTIVE' }
    ]
  });

  try {
    console.log('TEST 1: Security event creation creates AuditLog entry and sanitizes sensitive fields');
    const event = await SecurityEventService.logEvent(tenantA, {
      eventType: 'FAILED_LOGIN',
      severity: 'HIGH',
      source: 'auth_service',
      userId: adminA,
      metadata: { attempt: 5, password: 'SuperSecretPassword123!', token: 'jwt-token-123' }
    }, 'SYSTEM', adminA);

    const auditLog = await globalPrisma.auditLog.findFirst({
      where: { resource: 'SECURITY_EVENT', resourceId: event.id }
    });

    if (!auditLog) throw new Error('Test 1 Failed: Audit log not created');
    
    const meta = event.metadata as Record<string, any>;
    if (meta.password !== '[REDACTED]' || meta.token !== '[REDACTED]') {
      throw new Error('Test 1 Failed: Sensitive fields not sanitized');
    }
    console.log('✅ Success');

    // Setup Mock for requireAuth / requireTenant / requirePermission
    // Because those are hard to mock natively without jest, we will just test the raw global query constraints.
    // The service layer tests would normally mock auth, but here we can just verify the Prisma isolation.

    // 1. Tenant A cannot read Tenant B security events
    console.log('\nTEST 2: Tenant Isolation');
    await SecurityEventService.logEvent(tenantB, {
      eventType: 'SUSPICIOUS_ACTIVITY', severity: 'CRITICAL', source: 'firewall', userId: adminB
    });

    // Simulate reading via standard Prisma extensions (RLS)
    const prismaModule = await import('../database/utils/prisma-tenant');
    const tPrismaA = prismaModule.withTenant(tenantA);

    const allEventsA = await tPrismaA.securityEvent.findMany();
    if (allEventsA.some(e => e.tenantId === tenantB)) {
      throw new Error('Test 2 Failed: Tenant A can see Tenant B events');
    }
    console.log('✅ Success: Tenant isolation working');

  } finally {
    // Cleanup
    await globalPrisma.securityEvent.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await globalPrisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await globalPrisma.user.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await globalPrisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await globalPrisma.$disconnect();
    console.log('\n--- All Tests Complete ---');
  }
}

runTests().catch(e => {
  console.error('Fatal Test Error:', e);
  process.exit(1);
});
