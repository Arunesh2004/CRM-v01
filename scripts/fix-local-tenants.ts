import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching pending tenants...');
  const tenants = await prisma.tenant.findMany({
    where: { status: 'PENDING' }
  });

  if (tenants.length === 0) {
    console.log('No pending tenants found.');
    return;
  }

  console.log(`Found ${tenants.length} pending tenants. Updating to ACTIVE...`);
  
  const updateResult = await prisma.tenant.updateMany({
    where: { status: 'PENDING' },
    data: { status: 'ACTIVE' }
  });

  console.log(`Successfully updated ${updateResult.count} tenants to ACTIVE.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
