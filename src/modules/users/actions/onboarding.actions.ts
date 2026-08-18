import { requireAuth } from '@/lib/auth';
import prisma from '@/../database/utils/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function completeProfileAction(formData: FormData) {
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

  const updatedUser = await prisma.user.update({
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
