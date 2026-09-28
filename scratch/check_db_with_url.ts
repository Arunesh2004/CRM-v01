import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL="postgresql://postgres.pdlcylnpkejypinrqxzm:Asifitsyourlast.6@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

const prisma = new PrismaClient();

async function check() {
  const email = 'vasudevrathore126@gmail.com';
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      userRoles: {
        include: { role: true }
      },
      tenant: true
    }
  });

  if (!user) {
    console.log(JSON.stringify({ found: false }));
    return;
  }

  console.log(JSON.stringify({
    found: true,
    id: user.id,
    email: user.email,
    clerkId: user.clerkId,
    status: user.status,
    tenantId: user.tenantId,
    tenantName: user.tenant?.name,
    employeeId: user.employeeId,
    roles: user.userRoles.map(ur => ur.role.name)
  }, null, 2));

  await prisma.$disconnect();
}

check().catch(e => {
  console.error("DB_ERROR:", e.message);
  process.exit(1);
});
