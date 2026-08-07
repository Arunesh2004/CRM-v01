import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function checkDb() {
  const users = await prisma.user.findMany({
    include: {
      tenant: true,
      userRoles: {
        include: {
          role: true
        }
      }
    }
  });

  const tenants = await prisma.tenant.findMany();
  const roles = await prisma.role.findMany();
  const userRoles = await prisma.userRole.findMany();
  
  let auditLogs = [];
  try {
    auditLogs = await (prisma as any).auditLog.findMany();
  } catch (e) {}

  const result = {
    users,
    tenants,
    roles,
    userRoles,
    auditLogs
  };

  fs.writeFileSync('db_auth_verification.json', JSON.stringify(result, null, 2));
}

checkDb()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
