import { prismaAdmin } from '../database/utils/prisma';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

async function createEnvironmentSnapshot() {
  console.log('Initializing Phase 6.3 Baseline Snapshot...');

  const alphaId = 'alpha-63';
  const betaId = 'beta-63';
  const gammaId = 'gamma-63';

  // 1. Clean existing test data (if any)
  console.log('Cleaning existing test namespaces...');
  await prismaAdmin.$queryRawUnsafe(`ALTER TABLE "RecoveryAuditLog" DISABLE TRIGGER ALL`);
  await prismaAdmin.$queryRawUnsafe(`DELETE FROM "RecoveryAuditLog" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
  await prismaAdmin.$queryRawUnsafe(`ALTER TABLE "RecoveryAuditLog" ENABLE TRIGGER ALL`);
  
  await prismaAdmin.$queryRawUnsafe(`DELETE FROM "RecoveryJob" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
  await prismaAdmin.$queryRawUnsafe(`DELETE FROM "RecoverySnapshot" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
  await prismaAdmin.$queryRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
  await prismaAdmin.$queryRawUnsafe(`DELETE FROM "User" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
  await prismaAdmin.$queryRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${alphaId}', '${betaId}', '${gammaId}')`);

  // 2. Populate Alpha (Enterprise)
  console.log('Populating Alpha Corporation...');
  await prismaAdmin.tenant.create({ data: { id: alphaId, name: 'Alpha Corporation', status: 'ACTIVE' } });
  const alphaOwner = await prismaAdmin.user.create({ data: { tenantId: alphaId, clerkId: 'c-alpha-own', email: 'owner@alpha.com' } });
  await prismaAdmin.tenant.update({ where: { id: alphaId }, data: { ownerId: alphaOwner.id } });
  
  for(let i=0; i<50; i++) {
    await prismaAdmin.customer.create({ data: { tenantId: alphaId, name: `Alpha Cust ${i}`, normalizedName: `A-CUST-${i}` } });
  }

  // 3. Populate Beta (Medium)
  console.log('Populating Beta Corporation...');
  await prismaAdmin.tenant.create({ data: { id: betaId, name: 'Beta Corporation', status: 'ACTIVE' } });
  const betaOwner = await prismaAdmin.user.create({ data: { tenantId: betaId, clerkId: 'c-beta-own', email: 'owner@beta.com' } });
  await prismaAdmin.tenant.update({ where: { id: betaId }, data: { ownerId: betaOwner.id } });

  for(let i=0; i<10; i++) {
    await prismaAdmin.customer.create({ data: { tenantId: betaId, name: `Beta Cust ${i}`, normalizedName: `B-CUST-${i}` } });
  }

  // 4. Populate Gamma (Small)
  console.log('Populating Gamma Corporation...');
  await prismaAdmin.tenant.create({ data: { id: gammaId, name: 'Gamma Corporation', status: 'ACTIVE' } });
  const gammaOwner = await prismaAdmin.user.create({ data: { tenantId: gammaId, clerkId: 'c-gamma-own', email: 'owner@gamma.com' } });
  await prismaAdmin.tenant.update({ where: { id: gammaId }, data: { ownerId: gammaOwner.id } });

  // 5. Generate Checksums & Baseline Row Counts
  console.log('Generating Baseline Checksums...');
  const snapshot: any = {};
  
  for (const tid of [alphaId, betaId, gammaId]) {
    const usersCount = await prismaAdmin.user.count({ where: { tenantId: tid } });
    const custCount = await prismaAdmin.customer.count({ where: { tenantId: tid } });
    
    const hash = crypto.createHash('sha256').update(`${tid}-${usersCount}-${custCount}`).digest('hex');
    snapshot[tid] = { usersCount, custCount, hash };
  }

  const snapshotPath = path.join(process.cwd(), 'PHASE_6_3_BASELINE_SNAPSHOT.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  console.log(`Baseline snapshot saved to: ${snapshotPath}`);
}

createEnvironmentSnapshot().catch(console.error).finally(() => prismaAdmin.$disconnect());
