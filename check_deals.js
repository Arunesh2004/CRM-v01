const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const deals = await prisma.deal.findMany({ include: { customer: true } });
  console.log(deals.map(d => ({ title: d.title, customerName: d.customer.name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
