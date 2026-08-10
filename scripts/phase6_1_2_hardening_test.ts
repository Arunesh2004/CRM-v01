import { prismaAdmin } from '../database/utils/prisma';
import { exportTenant } from '../src/modules/recovery/export.engine';
import { requestRestore, approveRestore, executeRestore } from '../src/modules/recovery/restore.engine';
import fs from 'fs';

async function runHardeningTest() {
  const report: any = { results: {} };

  try {
    const alphaId = 'alpha-h-1';
    const betaId = 'beta-h-1';
    const gammaId = 'gamma-h-1';
    
    // Cleanup first
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "User" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${alphaId}', '${betaId}', '${gammaId}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "RecoveryJob"`);

    // A. Company Creation
    await prismaAdmin.tenant.create({ data: { id: alphaId, name: 'Alpha H', status: 'ACTIVE' } });
    await prismaAdmin.tenant.create({ data: { id: betaId, name: 'Beta H', status: 'ACTIVE' } });
    await prismaAdmin.tenant.create({ data: { id: gammaId, name: 'Gamma H', status: 'ACTIVE' } });

    const alphaOwner = await prismaAdmin.user.create({ data: { tenantId: alphaId, clerkId: 'c-ah-own', email: 'o@ah.com' } });
    const betaOwner = await prismaAdmin.user.create({ data: { tenantId: betaId, clerkId: 'c-bh-own', email: 'o@bh.com' } });
    const gammaOwner = await prismaAdmin.user.create({ data: { tenantId: gammaId, clerkId: 'c-gh-own', email: 'o@gh.com' } });

    await prismaAdmin.tenant.update({ where: { id: alphaId }, data: { ownerId: alphaOwner.id } });

    await prismaAdmin.customer.create({ data: { tenantId: alphaId, name: 'Alpha Cust', normalizedName: 'A-Cust-H' } });
    await prismaAdmin.customer.create({ data: { tenantId: betaId, name: 'Beta Cust', normalizedName: 'B-Cust-H' } });
    
    // 1. Export Alpha
    process.env.STORAGE_PROVIDER = 'local';
    const exportResult = await exportTenant(alphaId, alphaOwner.id);
    report.results['StorageAbstraction_Upload'] = exportResult.archiveLocation.startsWith('local://') ? 'PASS (Abstracted)' : 'FAIL';

    // 2. Immutability Test
    const log = await prismaAdmin.recoveryAuditLog.findFirst();
    if (log) {
      try {
        await prismaAdmin.recoveryAuditLog.delete({ where: { id: log.id } });
        report.results['Audit_Immutability_Delete'] = 'FAIL (Allowed)';
      } catch (e: any) {
        report.results['Audit_Immutability_Delete'] = e.message.includes('strictly forbidden') ? 'PASS (Blocked by Trigger)' : 'FAIL';
      }
      try {
        await prismaAdmin.recoveryAuditLog.update({ where: { id: log.id }, data: { action: 'HACKED' } });
        report.results['Audit_Immutability_Update'] = 'FAIL (Allowed)';
      } catch (e: any) {
        report.results['Audit_Immutability_Update'] = e.message.includes('strictly forbidden') ? 'PASS (Blocked by Trigger)' : 'FAIL';
      }
    }

    // 3. Workflow Validation
    const jobRec = await requestRestore(exportResult.archiveLocation, alphaOwner.id, 'RECOVERY');
    
    try {
      await executeRestore(jobRec.id);
      report.results['Workflow_ExecutionWithoutApproval'] = 'FAIL (Allowed)';
    } catch(e: any) {
      report.results['Workflow_ExecutionWithoutApproval'] = e.message.includes('must be APPROVED') ? 'PASS (Blocked)' : 'FAIL';
    }

    // 4. Dry Run Mode Validation
    const job = await requestRestore(exportResult.archiveLocation, alphaOwner.id, 'DRY_RUN');
    report.results['Workflow_Requested'] = job.status === 'REQUESTED' ? 'PASS' : 'FAIL';

    // Approve the job
    await approveRestore(job.id);
    
    // Execute Dry Run
    const dryRunRes = await executeRestore(job.id);
    report.results['Workflow_DryRun_Execution'] = (dryRunRes as any).validation === 'PASS' ? 'PASS' : 'FAIL';
    
    // Ensure DB didn't mutate (Alpha is still there)
    const alphaCount = await prismaAdmin.tenant.count({ where: { id: alphaId } });
    report.results['Workflow_DryRun_NoMutation'] = alphaCount === 1 ? 'PASS' : 'FAIL';

    // 4. Actual Recovery
    await prismaAdmin.customer.deleteMany({ where: { tenantId: alphaId } });
    await prismaAdmin.user.deleteMany({ where: { tenantId: alphaId } });
    await prismaAdmin.tenant.delete({ where: { id: alphaId } });

    const job2 = await requestRestore(exportResult.archiveLocation, alphaOwner.id, 'RECOVERY');
    await approveRestore(job2.id);
    await executeRestore(job2.id);

    const alphaCountAfter = await prismaAdmin.tenant.count({ where: { id: alphaId } });
    const alphaCustCount = await prismaAdmin.customer.count({ where: { tenantId: alphaId } });
    report.results['Recovery_Success'] = (alphaCountAfter === 1 && alphaCustCount === 1) ? 'PASS' : 'FAIL';

    // Verify Beta untouched
    const betaCustCount = await prismaAdmin.customer.count({ where: { tenantId: betaId } });
    report.results['Isolation_BetaUntouched'] = betaCustCount === 1 ? 'PASS' : 'FAIL';

    console.log(JSON.stringify(report, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    // Cleanup
    const alphaId = 'alpha-h-1';
    const betaId = 'beta-h-1';
    const gammaId = 'gamma-h-1';
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "User" WHERE "tenantId" IN ('${alphaId}', '${betaId}', '${gammaId}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${alphaId}', '${betaId}', '${gammaId}')`);
    await prismaAdmin.$queryRawUnsafe(`DELETE FROM "RecoveryJob"`);
    await prismaAdmin.$disconnect();
  }
}

runHardeningTest();
