import { PrismaClient } from '@prisma/client';
import fs from 'fs';

// Manually parse .env.production
const envFile = fs.readFileSync('.env.production', 'utf-8');
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    process.env.DATABASE_URL = line.split('=')[1].trim().replace(/^"|"$/g, '');
  }
}

const prisma = new PrismaClient();

async function check() {
  const email = 'vasudevrathore126@gmail.com';
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      userRoles: {
        include: { role: true }
      }
    }
  });

  if (!user) {
    console.log('USER_NOT_FOUND');
    return;
  }

  console.log('--- USER ROW ---');
  console.log('id:', user.id);
  console.log('email:', user.email);
  console.log('clerkId:', user.clerkId);
  console.log('status:', user.status);
  console.log('tenantId:', user.tenantId);
  console.log('employeeId:', user.employeeId);
  console.log('--- ROLES ---');
  for (const ur of user.userRoles) {
    console.log('Role Name:', ur.role.name);
  }

  await prisma.$disconnect();
}

check().catch(console.error);
