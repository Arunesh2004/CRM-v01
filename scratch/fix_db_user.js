require('dotenv').config({ path: 'temp_db_pull/.env' });
const { PrismaClient } = require('@prisma/client');

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: { url }
  }
});

async function run() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'demo@company.com' }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('Found user:', user.email, 'Current clerkId:', user.clerkId);
    
    // Set clerkId to null so it can be dynamically bound on next login
    await prisma.user.update({
      where: { id: user.id },
      data: { clerkId: null }
    });
    
    console.log('clerkId successfully set to null. User is ready for Clerk Demo login.');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
