import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function verifyLeads() {
  const leads = await prisma.lead.findMany({
    include: {
      tasks: true,
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
    leads,
    auditLogs,
    activities
  };

  fs.writeFileSync('db_leads_verification.json', JSON.stringify(result, null, 2));
}

verifyLeads()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
