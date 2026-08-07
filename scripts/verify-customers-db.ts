import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function checkDb() {
  const customers = await prisma.customer.findMany({
    include: {
      locations: true,
      tenant: true,
      assignedUser: true
    }
  });
  
  let auditLogs = [];
  try {
    auditLogs = await (prisma as any).auditLog.findMany();
  } catch (e) {}

  let activities = [];
  try {
    activities = await prisma.activityTimeline.findMany();
  } catch (e) {}

  const result = {
    customers,
    auditLogs,
    activities
  };

  fs.writeFileSync('db_customers_verification.json', JSON.stringify(result, null, 2));
}

checkDb()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
