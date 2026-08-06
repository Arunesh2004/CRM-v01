import { getCurrentUser } from './auth';

export async function getCurrentUserContext() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function getCurrentTenantContext() {
  const user = await getCurrentUserContext();
  if (!user.tenantId) {
    throw new Error('User has no tenant assigned');
  }
  return user.tenantId;
}
