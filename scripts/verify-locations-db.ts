import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function checkDb() {
  const locations = await prisma.location.findMany({
    include: {
      tenant: true,
      customer: true
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
    locations,
    auditLogs,
    activities
  };

  fs.writeFileSync('db_locations_verification.json', JSON.stringify(result, null, 2));
}

checkDb()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
