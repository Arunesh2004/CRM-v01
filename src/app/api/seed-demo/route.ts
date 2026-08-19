import { NextResponse } from 'next/server';
import { prismaAdmin as prisma } from '@/../database/utils/prisma';

export async function GET() {
  try {
    // We must bypass RLS for this operation
    let tenant = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'on', true)`);
      return tx.tenant.findFirst();
    });

    if (!tenant) {
      tenant = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'on', true)`);
        return tx.tenant.create({ data: { id: 'demo-tenant-1', name: 'Acme Security', status: 'ACTIVE' } });
      });
    }
    
    let user = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'on', true)`);
      return tx.user.findFirst({ where: { email: 'demo@company.com' } });
    });

    if (!user) {
      user = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'on', true)`);
        return tx.user.create({
          data: {
            email: 'demo@company.com',
            clerkId: 'demo-clerk',
            tenantId: tenant.id,
            status: 'ACTIVE',
            onboardingStatus: 'COMPLETED',
            employeeId: 'DEMO-001'
          }
        });
      });
      
      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'on', true)`);
        return tx.role.create({
          data: {
            tenantId: tenant.id,
            name: 'DEMO_VIEWER',
            permissions: ['read:all'],
            userIds: [user.id]
          }
        });
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
