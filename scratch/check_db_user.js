require('dotenv').config({ path: 'temp_db_pull/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findFirst({
    where: { email: 'demo@company.com' }
  });
  console.log(user);
  await prisma.$disconnect();
}
checkUser();
