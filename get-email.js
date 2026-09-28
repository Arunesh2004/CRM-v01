const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({ where: { id: 'e2e-admin-a-0000-0000-000000000000' } });
  console.log('EMAIL:', u.email);
}
main().catch(console.error).finally(() => prisma.$disconnect());
