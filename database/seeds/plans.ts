import { PrismaClient, BillingCycle } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      name: 'FREE',
      price: 0,
      billingCycle: BillingCycle.MONTHLY,
      limits: { cameras: 1, users: 1 },
      features: ['Basic CRM', '1 Camera']
    },
    {
      name: 'STARTER',
      price: 49,
      billingCycle: BillingCycle.MONTHLY,
      limits: { cameras: 5, users: 5 },
      features: ['Basic CRM', '5 Cameras', 'Email Support']
    },
    {
      name: 'PROFESSIONAL',
      price: 199,
      billingCycle: BillingCycle.MONTHLY,
      limits: { cameras: 20, users: 20 },
      features: ['Advanced CRM', '20 Cameras', 'Priority Support', 'AI Events']
    },
    {
      name: 'ENTERPRISE',
      price: 999,
      billingCycle: BillingCycle.MONTHLY,
      limits: { cameras: 9999, users: 9999 }, // effectively unlimited
      features: ['Everything Unlimited', 'Dedicated Account Manager', 'Custom Models']
    }
  ];

  for (const plan of plans) {
    const existing = await prisma.plan.findFirst({ where: { name: plan.name } });
    if (!existing) {
      await prisma.plan.create({ data: plan });
    }
  }
  console.log('Plans seeded!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
