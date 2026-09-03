'use server';
import { withServerActionContext } from '@/lib/observability/server-action';

import { requireAuth } from '@/lib/auth';
import prisma from '@db/utils/prisma';
import { redirect } from 'next/navigation';

async function _submitOnboarding(formData: FormData) {
  const user = await requireAuth();

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = formData.get('phone') as string;
  const designation = formData.get('designation') as string;

  if (!firstName || !lastName || !phone || !designation) {
    throw new Error('All fields are required for onboarding');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName,
      lastName,
      phone,
      designation,
      onboardingStatus: 'COMPLETED',
    }
  });

  redirect('/dashboard');
}

export const submitOnboarding = withServerActionContext(_submitOnboarding);
