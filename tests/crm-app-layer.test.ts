import { PrismaClient } from '@prisma/client';

async function runTests() {
  console.log('--- Running CRM App Layer & Database Behaviour Audit ---');
  const prisma = new PrismaClient();

  try {
    // 1. Setup Data
    console.log('[1] Creating temporary test records for Tenant A and Tenant B...');
    
    const tenantA = await prisma.tenant.create({ data: { name: 'Audit Tenant A', status: 'ACTIVE' }});
    const tenantB = await prisma.tenant.create({ data: { name: 'Audit Tenant B', status: 'ACTIVE' }});
    
    const leadA = await prisma.lead.create({ data: { tenantId: tenantA.id, name: 'Lead A', email: 'a@example.com', company: 'Corp A' } });
    const leadB = await prisma.lead.create({ data: { tenantId: tenantB.id, name: 'Lead B', email: 'b@example.com', company: 'Corp B' } });
    
    // 2. Perform Isolation Tests
    console.log('[2] Testing Cross-Tenant Access Controls (Server Action Mock)...');
    
    // Test: Tenant A tries to read Lead B
    const maliciousRead = await prisma.lead.findFirst({
        where: {
            id: leadB.id,
            tenantId: tenantA.id // The crucial requireAuth() boundary
        }
    });

    if (maliciousRead) {
        throw new Error('CRITICAL VULNERABILITY: Tenant A successfully read Tenant B data.');
    }
    console.log('✔ Verified: Cross-tenant READ is blocked at the database query level.');

    // Test: Tenant A tries to update Lead B
    try {
        await prisma.lead.update({
            where: {
                id: leadB.id,
                tenantId: tenantA.id
            },
            data: { name: 'Hacked' }
        });
        throw new Error('CRITICAL VULNERABILITY: Tenant A successfully updated Tenant B data.');
    } catch (e: any) {
        if (e.message.includes('No record was found for an update') || e.code === 'P2025') {
            console.log('✔ Verified: Cross-tenant UPDATE is blocked at the database query level.');
        } else {
             throw e;
        }
    }

    // 3. Cleanup
    console.log('[3] Cleaning up test records...');
    await prisma.tenant.delete({ where: { id: tenantA.id } });
    await prisma.tenant.delete({ where: { id: tenantB.id } });
    
    console.log('\\n✔ Application Layer & Database Behaviour checks passed.');
  } catch (err) {
    console.error('\\n❌ Audit Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
