"use server";
import { withServerActionContext } from '@/lib/observability/server-action';
import { withTenant } from '@db/utils/prisma-tenant';

import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function _completeProfileAction(formData: FormData) {
  const user = await requireAuth();

  if (user.onboardingStatus !== 'PENDING') {
    throw new Error('Onboarding is already completed.');
  }

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = formData.get('phone') as string;
  const designation = formData.get('designation') as string;

  if (!firstName || !lastName || !phone || !designation) {
    throw new Error('All fields are required.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  const updatedUser = await withTenant(user.tenantId).user.update({
    where: { id: user.id },
    data: {
      firstName,
      lastName,
      phone,
      designation,
      onboardingStatus: 'COMPLETED'
    }
  });

  const { createAuditLog } = await import('../../audit/audit.service');
  await createAuditLog({
    tenantId: user.tenantId,
    actorId: user.id,
    action: 'PROFILE_COMPLETED',
    resource: 'USER',
    resourceId: user.id
  });

  revalidatePath('/');
  redirect('/dashboard');
}

export const completeProfileAction = withServerActionContext(_completeProfileAction);
