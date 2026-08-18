import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Verification ---');
  try {
    const user = await prisma.user.findFirst({
      where: { clerkId: 'test_123' },
    });
    console.log('Result:', user);
  } catch (err) {
    console.error('Error:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
