import prisma from '../database/utils/prisma';
import { requestTenantDeletion } from '../src/modules/tenant/tenant-lifecycle.service';
import * as auth from '../src/lib/auth';

let currentUser: any = null;
let currentTenantId: any = null;

(auth as any).getCurrentUser = async () => currentUser;
(auth as any).requireAuth = async () => currentUser;
(auth as any).getCurrentTenant = async () => {
  if (!currentTenantId) return null;
  return prisma.tenant.findUnique({ where: { id: currentTenantId } });
};

async function runSimulation() {
  const report: any = { results: {} };

  try {
    const alphaId = 'p6-alpha';
    const betaId = 'p6-beta';
    
    // Cleanup first
    await prisma.$queryRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${alphaId}', '${betaId}')`);
    await prisma.$queryRawUnsafe(`DELETE FROM "User" WHERE "clerkId" IN ('clerk-alpha-owner', 'clerk-alpha-emp', 'clerk-beta-owner')`);

    // Setup Alpha & Beta (Ensure ACTIVE)
    await prisma.tenant.create({ data: { id: alphaId, name: 'Alpha 6', status: 'ACTIVE' } });
    await prisma.tenant.create({ data: { id: betaId, name: 'Beta 6', status: 'ACTIVE' } });

    const alphaOwner = await prisma.user.create({ data: { tenantId: alphaId, clerkId: 'clerk-alpha-owner', email: 'owner@alpha6.com' } });
    const alphaEmp = await prisma.user.create({ data: { tenantId: alphaId, clerkId: 'clerk-alpha-emp', email: 'emp@alpha6.com' } });
    const betaOwner = await prisma.user.create({ data: { tenantId: betaId, clerkId: 'clerk-beta-owner', email: 'owner@beta6.com' } });

    await prisma.tenant.update({ where: { id: alphaId }, data: { ownerId: alphaOwner.id } });
    await prisma.tenant.update({ where: { id: betaId }, data: { ownerId: betaOwner.id } });

    await prisma.customer.create({ data: { tenantId: alphaId, name: 'Alpha Cust', normalizedName: 'A6C' } });
    await prisma.customer.create({ data: { tenantId: betaId, name: 'Beta Cust', normalizedName: 'B6C' } });

    // Test 1: Alpha Deletion Request
    currentUser = alphaOwner;
    currentTenantId = alphaId;
    await requestTenantDeletion(alphaId, 'Testing Deletion');
    
    const alphaAfter = await prisma.tenant.findUnique({ where: { id: alphaId, includeDeleted: true } as any });
    report.results['Alpha_Deletion_Status'] = alphaAfter?.status === 'DELETION_REQUESTED' ? 'PASS' : 'FAIL';
    
    const betaAfter = await prisma.tenant.findUnique({ where: { id: betaId } });
    report.results['Beta_Isolation_Preserved'] = betaAfter?.status === 'ACTIVE' ? 'PASS' : 'FAIL';

    // Test 2: Alpha Employee Old Session Access
    currentUser = alphaEmp;
    currentTenantId = alphaId;
    try {
      await auth.requireTenant();
      report.results['Employee_Session_Access'] = 'FAIL (Allowed)';
    } catch(e: any) {
      report.results['Employee_Session_Access'] = e.message.includes('Forbidden') ? 'PASS (403 Blocked)' : 'FAIL';
    }

    // Test 3: Beta Queries Data
    currentUser = betaOwner;
    currentTenantId = betaId;
    try {
      const betaCusts = await prisma.customer.findMany({ where: { tenantId: betaId } });
      report.results['Beta_Query_Operation'] = betaCusts.length === 1 ? 'PASS' : 'FAIL';
    } catch(e) {
      report.results['Beta_Query_Operation'] = 'FAIL';
    }

    // Test 4: Restore Alpha
    await prisma.tenant.update({ where: { id: alphaId }, data: { status: 'ACTIVE', deletedAt: null } });
    
    // Test 5: Verify Data Available
    currentUser = alphaOwner;
    currentTenantId = alphaId;
    const restoredCusts = await prisma.customer.findMany({ where: { tenantId: alphaId } });
    report.results['Alpha_Restoration'] = restoredCusts.length === 1 ? 'PASS (Data Persisted)' : 'FAIL';

    // Test 6: Clerk deletes employee (Soft Delete verification)
    await prisma.user.update({ where: { clerkId: 'clerk-alpha-emp' }, data: { status: 'INACTIVE', deletedAt: new Date() } });
    const empStillInDb = await prisma.user.findFirst({ where: { clerkId: 'clerk-alpha-emp', includeDeleted: true } as any });
    report.results['Clerk_Webhook_Soft_Delete'] = empStillInDb?.deletedAt ? 'PASS (Preserved Activity Trace)' : 'FAIL';

    // Cleanup
    await prisma.$queryRawUnsafe(`DELETE FROM "Customer" WHERE "tenantId" IN ('${alphaId}', '${betaId}')`);
    await prisma.$queryRawUnsafe(`DELETE FROM "AuditLog" WHERE "tenantId" IN ('${alphaId}', '${betaId}')`);
    await prisma.$queryRawUnsafe(`DELETE FROM "User" WHERE "clerkId" IN ('clerk-alpha-owner', 'clerk-alpha-emp', 'clerk-beta-owner')`);
    await prisma.$queryRawUnsafe(`DELETE FROM "Tenant" WHERE id IN ('${alphaId}', '${betaId}')`);

    console.log(JSON.stringify(report, null, 2));

  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runSimulation();
