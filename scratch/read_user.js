const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://postgres.pdlcylnpkejypinrqxzm:Asifitsyourlast.6@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true" }
  }
});

async function run() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'demo@company.com' },
      include: { tenant: true, userRoles: { include: { role: true } } }
    });
    
    if (user) {
      console.log('User found:');
      console.log('email:', user.email);
      console.log('clerkId:', user.clerkId);
      console.log('status:', user.status);
      console.log('tenant:', user.tenant ? user.tenant.name : 'null');
      console.log('roles:', user.userRoles.map(ur => ur.role.name).join(', '));
      console.log('onboardingStatus:', user.onboardingStatus);
    } else {
      console.log('User demo@company.com not found');
    }
    
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@acmesecurity.com' },
      include: { tenant: true, userRoles: { include: { role: true } } }
    });
    
    if (admin) {
      console.log('Admin found:');
      console.log('email:', admin.email);
      console.log('clerkId:', admin.clerkId);
      console.log('status:', admin.status);
    }
  } catch(e) {
    console.error('Error connecting to DB:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
