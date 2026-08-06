import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { getCurrentSubscription } from '../subscription/subscription.service';

export async function getTenantUsage() {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  
  const subscription = await getCurrentSubscription();
  const plan = subscription?.plan;
  
  // Example feature limits from plan.limits JSON
  // limits: { cameras: 5, users: 10 }
  let maxCameras = 0;
  let maxUsers = 0;
  
  if (plan && plan.limits) {
    const limits: any = plan.limits;
    maxCameras = limits.cameras || 0;
    maxUsers = limits.users || 0;
  }
  
  // If no plan, assume 0 or defaults.
  // The actual usage count:
  const cameraCount = await prisma.camera.count({ where: { tenantId } });
  const userCount = await prisma.user.count({ where: { tenantId } });
  
  return {
    cameras: {
      used: cameraCount,
      limit: maxCameras
    },
    users: {
      used: userCount,
      limit: maxUsers
    }
  };
}
