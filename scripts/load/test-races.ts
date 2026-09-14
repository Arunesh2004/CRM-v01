import { executeAsSystem } from '../../database/utils/prisma-system';
import { withTenant, withTenantTransaction } from '../../database/utils/prisma-tenant';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const globalPrisma = new PrismaClient();

async function runRaceTest() {
  console.log('--- Phase 11 Concurrency Race Test ---');
  const tenantId = crypto.randomUUID();

  // Create a lead to update
  const leadId = crypto.randomUUID();
  const { SystemOperation } = await import('../../database/utils/prisma-system');
  await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
    await tx.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, name: 'Race Tenant', status: 'ACTIVE' }
    });
    await tx.lead.create({
      data: {
        id: leadId,
        tenantId,
        name: `Race Lead ${leadId}`,
        company: `Race Corp ${leadId}`,
        status: 'NEW',
      }
    });
  });

  console.log(`Starting 10 concurrent updates on Lead ${leadId}`);
  const tenantPrisma = withTenant(tenantId);
  const initialLead = await tenantPrisma.lead.findUnique({ where: { id: leadId, tenantId } });

  const workers = Array.from({ length: 10 }).map(async (_, idx) => {
    try {
      // Simulate concurrent read-then-write
      return await globalPrisma.$transaction(async (baseTx) => {
        const tx = await withTenantTransaction(baseTx, tenantId);
        
        const updateResult = await tx.lead.updateMany({
          where: { 
            id: leadId, 
            tenantId, 
            updatedAt: initialLead!.updatedAt 
          },
          data: {
            name: `Race Lead ${idx}`
          }
        });

        if (updateResult.count === 0) {
          throw new Error('CONCURRENCY_CONFLICT');
        }
        return 'SUCCESS';
      });
    } catch (e: any) {
      if (e.message === 'CONCURRENCY_CONFLICT') {
        return 'CONFLICT';
      }
      return 'ERROR';
    }
  });

  const results = await Promise.all(workers);
  const successes = results.filter(r => r === 'SUCCESS').length;
  const conflicts = results.filter(r => r === 'CONFLICT').length;

  console.log(`Total Successes: ${successes}`);
  console.log(`Total Conflicts: ${conflicts}`);

  if (successes === 1 && conflicts === 9) {
    console.log('RACE TEST PASSED: Optimistic concurrency successfully blocked races.');
  } else {
    console.log('RACE TEST FAILED: Invalid concurrency handling.');
    process.exit(1);
  }

  await globalPrisma.$disconnect();
}

runRaceTest().catch(console.error);
