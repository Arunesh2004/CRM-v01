import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runForensicAudit() {
  const report: any = {};
  const tenantId = 'demo-tenant-1';
  const otherTenantId = 'f14e9658-448c-4e0e-839b-7e4064dc2dc6'; // From earlier scripts

  try {
    // 1. Customer Duplicate Case Sensitivity
    const cust1 = await prisma.customer.create({
      data: { tenantId, name: 'ABC Pvt Ltd' }
    });

    try {
      const cust2 = await prisma.customer.create({
        data: { tenantId, name: 'abc pvt ltd' }
      });
      report.caseSensitivityBlocked = false; // It allowed it!
      await prisma.customer.delete({ where: { id: cust2.id } });
    } catch (e) {
      report.caseSensitivityBlocked = true;
    }
    
    await prisma.customer.delete({ where: { id: cust1.id } });

    // 4. Cross Tenant Assignment Check
    const lead = await prisma.lead.create({
      data: { tenantId, name: 'Cross Tenant Lead', company: 'Test' }
    });
    
    // Find a user in the OTHER tenant
    const otherUser = await prisma.user.findFirst({ where: { tenantId: otherTenantId } });
    if (otherUser) {
      try {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { assignedUserId: otherUser.id }
        });
        report.crossTenantAssignmentBlocked = false; // It allowed it!
      } catch (e) {
        report.crossTenantAssignmentBlocked = true;
      }
    } else {
      report.crossTenantAssignmentBlocked = 'No other user found to test';
    }
    
    await prisma.lead.delete({ where: { id: lead.id } });

    console.log(JSON.stringify(report, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

runForensicAudit();
