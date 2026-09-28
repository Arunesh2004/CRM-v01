const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findFirst();
  console.log('USER_ID:', u.id);
  console.log('TENANT_ID:', u.tenantId);
}
main().catch(console.error).finally(() => prisma.$disconnect());
