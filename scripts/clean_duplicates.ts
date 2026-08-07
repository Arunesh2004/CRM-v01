import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDuplicates() {
  // Clean Customer duplicates by keeping only the first one
  const customers = await prisma.customer.findMany();
  const customerSeen = new Set();
  for (const c of customers) {
    const key = `${c.tenantId}-${c.name}`;
    if (customerSeen.has(key)) {
      console.log(`Deleting duplicate customer: ${key}`);
      await prisma.customer.delete({ where: { id: c.id } });
    } else {
      customerSeen.add(key);
    }
  }

  // Clean Lead duplicates by keeping only the first one
  const leads = await prisma.lead.findMany();
  const leadEmailSeen = new Set();
  const leadNameCompanySeen = new Set();
  for (const l of leads) {
    if (l.email) {
      const emailKey = `${l.tenantId}-${l.email}`;
      if (leadEmailSeen.has(emailKey)) {
        console.log(`Deleting duplicate lead (email): ${emailKey}`);
        await prisma.lead.delete({ where: { id: l.id } });
        continue;
      }
      leadEmailSeen.add(emailKey);
    }
    const ncKey = `${l.tenantId}-${l.name}-${l.company}`;
    if (leadNameCompanySeen.has(ncKey)) {
      console.log(`Deleting duplicate lead (name+company): ${ncKey}`);
      await prisma.lead.delete({ where: { id: l.id } });
      continue;
    }
    leadNameCompanySeen.add(ncKey);
  }
}

cleanDuplicates()
  .then(() => console.log('Done'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
