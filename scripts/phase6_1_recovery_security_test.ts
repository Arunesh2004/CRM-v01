import { prismaAdmin } from '../database/utils/prisma';
import { exportTenant } from '../src/modules/recovery/export.engine';
import { restoreTenant } from '../src/modules/recovery/restore.engine';
import fs from 'fs';

async function runSimulation() {
  const report: any = { results: {} };

  try {
    const alphaId = 'alpha-rec-1';
    const betaId = 'beta-rec-1';
    const gammaId = 'gamma-rec-1';
    
    // Cleanup first
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "User" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${alphaId}', '${betaId}', '${gammaId}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "RecoveryJob"`);

    // A. Company Creation
    await prismaAdmin.tenant.create({ data: { id: alphaId, name: 'Alpha Recovery Co', status: 'ACTIVE' } });
    await prismaAdmin.tenant.create({ data: { id: betaId, name: 'Beta Recovery Co', status: 'ACTIVE' } });
    await prismaAdmin.tenant.create({ data: { id: gammaId, name: 'Gamma Recovery Co', status: 'ACTIVE' } });

    const alphaOwner = await prismaAdmin.user.create({ data: { tenantId: alphaId, clerkId: 'c-alpha-owner', email: 'owner@alpha.com' } });
    const alphaEmp = await prismaAdmin.user.create({ data: { tenantId: alphaId, clerkId: 'c-alpha-emp', email: 'emp@alpha.com' } });
    const betaOwner = await prismaAdmin.user.create({ data: { tenantId: betaId, clerkId: 'c-beta-owner', email: 'owner@beta.com' } });
    const gammaOwner = await prismaAdmin.user.create({ data: { tenantId: gammaId, clerkId: 'c-gamma-owner', email: 'owner@gamma.com' } });

    await prismaAdmin.tenant.update({ where: { id: alphaId }, data: { ownerId: alphaOwner.id } });
    await prismaAdmin.tenant.update({ where: { id: betaId }, data: { ownerId: betaOwner.id } });
    await prismaAdmin.tenant.update({ where: { id: gammaId }, data: { ownerId: gammaOwner.id } });

    // Seed Data
    await prismaAdmin.customer.create({ data: { tenantId: alphaId, name: 'Alpha Cust', normalizedName: 'A-Cust' } });
    await prismaAdmin.customer.create({ data: { tenantId: betaId, name: 'Beta Cust', normalizedName: 'B-Cust' } });
    
    // 1. Export Alpha
    const exportResult = await exportTenant(alphaId, alphaOwner.id);
    report.results['Alpha_Export_Success'] = exportResult.checksum ? 'PASS' : 'FAIL';

    // 2. Alpha Corruption Occurs
    await prismaAdmin.customer.deleteMany({ where: { tenantId: alphaId } });
    
    // Attack 1: Employee Restore Attempt
    try {
      await restoreTenant(exportResult.archiveLocation, alphaEmp.id, 'RECOVERY');
      report.results['Attack_1_Employee_Restore'] = 'FAIL (Allowed)';
    } catch (e: any) {
      report.results['Attack_1_Employee_Restore'] = e.message.includes('Forbidden') ? 'PASS (Blocked)' : 'FAIL';
    }

    // Attack 2: Admin cross-tenant restore
    try {
      await restoreTenant(exportResult.archiveLocation, betaOwner.id, 'RECOVERY');
      report.results['Attack_2_CrossTenant_Restore'] = 'FAIL (Allowed)';
    } catch (e: any) {
      report.results['Attack_2_CrossTenant_Restore'] = e.message.includes('Forbidden') ? 'PASS (Blocked)' : 'FAIL';
    }

    // Attack 3: Modified Export File
    try {
      const parts = exportResult.archiveLocation.split('?');
      await restoreTenant(`${parts[0]}_fake?${parts[1]}`, alphaOwner.id, 'DRY_RUN');
      report.results['Attack_3_Modified_Export'] = 'FAIL (Allowed)';
    } catch (e: any) {
      report.results['Attack_3_Modified_Export'] = e.message.includes('not found') ? 'PASS (Blocked)' : 'FAIL';
    }

    // 3. Delete Alpha completely for RECOVERY mode (since RECOVERY requires tenant to not exist, or we use CLONE)
    await prismaAdmin.user.deleteMany({ where: { tenantId: alphaId } });
    await prismaAdmin.tenant.delete({ where: { id: alphaId } });

    // 4. Duplicate Restore (Concurrency)
    try {
       // We can't actually easily do true concurrency without Promise.all, let's do Promise.all
       const p1 = restoreTenant(exportResult.archiveLocation, alphaOwner.id, 'RECOVERY');
       const p2 = restoreTenant(exportResult.archiveLocation, alphaOwner.id, 'RECOVERY');
       await Promise.all([p1, p2]);
       report.results['Attack_4_Concurrent_Restore'] = 'FAIL (Allowed)';
    } catch (e: any) {
       report.results['Attack_4_Concurrent_Restore'] = (e.message.includes('already in progress') || e.message.includes('Unique constraint') || e.message.includes('existing tenant')) ? 'PASS (Blocked)' : 'FAIL: ' + e.message;
    }

    // Wait for jobs to settle if one succeeded
    await new Promise(res => setTimeout(res, 500));

    // Verify Beta and Gamma are unchanged
    const betaCustomers = await prismaAdmin.customer.count({ where: { tenantId: betaId } });
    report.results['Beta_Unchanged'] = betaCustomers === 1 ? 'PASS' : 'FAIL';

    console.log(JSON.stringify(report, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    // Cleanup
    const alphaIdCleanup = 'alpha-rec-1';
    const betaIdCleanup = 'beta-rec-1';
    const gammaIdCleanup = 'gamma-rec-1';
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" IN ('${alphaIdCleanup}', '${betaIdCleanup}', '${gammaIdCleanup}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "User" WHERE "tenantId" IN ('${alphaIdCleanup}', '${betaIdCleanup}', '${gammaIdCleanup}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${alphaIdCleanup}', '${betaIdCleanup}', '${gammaIdCleanup}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "RecoveryJob"`);
    await prismaAdmin.$disconnect();
  }
}

runSimulation();
