import { NextResponse } from 'next/server';
import { executeAsSystem, SystemOperation } from '@/../database/utils/prisma-system';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const result = await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
      let tenant = await tx.tenant.findFirst();
      if (!tenant) {
        tenant = await tx.tenant.create({ data: { id: 'demo-tenant-1', name: 'Acme Security', status: 'ACTIVE' } });
      }
      
      let user = await tx.user.findFirst({ where: { email: 'demo@company.com' } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: 'demo@company.com',
            clerkId: 'demo-clerk',
            tenantId: tenant.id,
            status: 'ACTIVE',
            onboardingStatus: 'COMPLETED',
            employeeId: 'DEMO-001'
          }
        });
        
        const newRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: 'DEMO_VIEWER'
          }
        });

        let perm = await tx.permission.findFirst();
        if (perm) {
          await tx.rolePermission.create({
            data: {
              roleId: newRole.id,
              permissionId: perm.id,
              tenantId: tenant.id
            }
          });
        }

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: newRole.id,
            tenantId: tenant.id
          }
        });
      }
      return { user };
    });

    return NextResponse.json({ success: true, user: result.user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
