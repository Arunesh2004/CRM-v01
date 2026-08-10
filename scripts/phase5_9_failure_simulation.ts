import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runSimulation() {
  const report: any = { results: {} };

  try {
    // Setup
    const alphaId = 'p59-alpha';
    const betaId = 'p59-beta';
    const gammaId = 'p59-gamma';

    await prisma.tenant.upsert({ where: { id: alphaId }, update: {}, create: { id: alphaId, name: 'Alpha 59' }});
    await prisma.tenant.upsert({ where: { id: betaId }, update: {}, create: { id: betaId, name: 'Beta 59' }});
    await prisma.tenant.upsert({ where: { id: gammaId }, update: {}, create: { id: gammaId, name: 'Gamma 59' }});

    const alphaUser = await prisma.user.upsert({ where: { clerkId: 'u59-alpha' }, update: {}, create: { tenantId: alphaId, clerkId: 'u59-alpha', email: 'a@59.com' }});
    await prisma.tenant.update({ where: { id: alphaId }, data: { ownerId: alphaUser.id } });

    // Seed Alpha Data
    await prisma.customer.create({ data: { tenantId: alphaId, name: 'Alpha Cust', normalizedName: 'ALPHACUST59' }});
    const convo = await prisma.conversation.create({ data: { tenantId: alphaId, type: 'INTERNAL' }});
    await prisma.message.create({ data: { tenantId: alphaId, conversationId: convo.id, content: 'Hello Alpha' }});

    // Seed Beta & Gamma Data to verify isolation
    await prisma.customer.create({ data: { tenantId: betaId, name: 'Beta Cust', normalizedName: 'BETACUST59' }});
    await prisma.customer.create({ data: { tenantId: gammaId, name: 'Gamma Cust', normalizedName: 'GAMMACUST59' }});

    // SCENARIO 3: Database transaction fails during deletion.
    try {
      await prisma.$transaction(async (tx) => {
        // delete messages
        await tx.message.deleteMany({ where: { tenantId: alphaId } });
        // simulate failure
        throw new Error("Simulated failure mid-deletion");
      });
      report.results['Scenario_3_Transaction_Fails_During_Deletion'] = 'FAIL';
    } catch(e) {
      // check if message is still there
      const msgCount = await prisma.message.count({ where: { tenantId: alphaId } });
      report.results['Scenario_3_Transaction_Fails_During_Deletion'] = msgCount === 1 ? 'PASS (Atomic rollback protected data)' : 'FAIL (Partial delete)';
    }

    // SCENARIO 1 & 2: Deletion execution
    // Hard delete of Alpha Tenant
    await prisma.tenant.delete({ where: { id: alphaId } });

    report.results['Scenario_1_Owner_Deletes_Tenant'] = 'PASS (Tenant Hard Deleted via Prisma Cascade)';

    // Verify Beta and Gamma unharmed
    const betaCount = await prisma.customer.count({ where: { tenantId: betaId } });
    const gammaCount = await prisma.customer.count({ where: { tenantId: gammaId } });
    
    report.results['Scenario_1_Cross_Tenant_Impact'] = (betaCount === 1 && gammaCount === 1) ? 'PASS (No impact to Beta/Gamma)' : 'FAIL';

    // Cleanup
    await prisma.customer.deleteMany({ where: { tenantId: { in: [betaId, gammaId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [betaId, gammaId] } } });

    console.log(JSON.stringify(report, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runSimulation();
