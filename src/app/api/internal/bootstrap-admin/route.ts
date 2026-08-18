import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ENV } from '@/lib/config/env';
import { currentUser } from '@clerk/nextjs/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  // 1. Verify we are in preview environment
  if (process.env.VERCEL_ENV !== 'preview' && process.env.VERCEL_TARGET_ENV !== 'preview') {
    return NextResponse.json({ error: 'This endpoint is only available in the Preview environment.' }, { status: 403 });
  }

  try {
    const tenantId = ENV.companyTenantId;
    const adminEmail = ENV.initialAdminEmail;

    if (!tenantId || !adminEmail) {
      return NextResponse.json({ error: 'Missing tenantId or adminEmail configuration' }, { status: 500 });
    }

    // 2. Authenticate Clerk User and verify email
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: No Clerk user found' }, { status: 401 });
    }

    const clerkEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase()?.trim();
    if (clerkEmail !== adminEmail) {
      return NextResponse.json({ error: 'Forbidden: Only the initial admin can bootstrap' }, { status: 403 });
    }

    // 3. Idempotently create tenant
    const tenant = await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        name: 'Canonical Company',
        status: 'ACTIVE',
      },
    });

    // 4. Ensure roles
    const roles = ['TENANT_ADMIN', 'DEPARTMENT_HEAD', 'MEMBER'];
    for (const roleName of roles) {
      const role = await prisma.role.findFirst({
        where: { name: roleName, tenantId: tenant.id },
      });
      if (!role) {
        await prisma.role.create({
          data: { name: roleName, tenantId: tenant.id },
        });
      }
    }

    // 5. Seed admin user
    const adminUser = await prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: tenant.id, email: adminEmail }
      },
      update: {}, // Idempotent: don't overwrite if exists
      create: {
        email: adminEmail,
        tenantId: tenant.id,
        status: 'INVITED',
        onboardingStatus: 'PENDING',
        firstName: 'System',
        lastName: 'Administrator',
      }
    });

    const adminRole = await prisma.role.findFirst({
      where: { name: 'TENANT_ADMIN', tenantId: tenant.id }
    });

    if (adminRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: { userId: adminUser.id, roleId: adminRole.id }
        },
        update: {},
        create: {
          userId: adminUser.id,
          roleId: adminRole.id
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bootstrap complete', 
      adminId: adminUser.id, 
      tenantId: tenant.id 
    });
  } catch (error: any) {
    console.error('Bootstrap failed:', error);
    return NextResponse.json({ error: 'Bootstrap failed', details: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
