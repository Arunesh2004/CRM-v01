import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeCustomerName(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function migrateData() {
  const customers = await prisma.customer.findMany();
  for (const customer of customers) {
    if (!customer.normalizedName) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { normalizedName: normalizeCustomerName(customer.name) }
      });
      console.log(`Updated customer ${customer.id} with normalized name: ${normalizeCustomerName(customer.name)}`);
    }
  }
}

migrateData()
  .then(() => console.log('Migration complete.'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
