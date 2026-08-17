'use server';

import { inviteEmployee, disableEmployee, updateEmployeeRole, reassignDepartment, updateProfile } from '@/modules/users/user.service';
import { revalidatePath } from 'next/cache';

export async function inviteEmployeeAction(formData: FormData) {
  try {
    const email = formData.get('email') as string;
    const roleName = formData.get('roleName') as string || 'MEMBER';
    const departmentId = formData.get('departmentId') as string | undefined;
    
    if (!email) throw new Error("Email is required");

    await inviteEmployee(email, roleName, departmentId);
    revalidatePath('/employees');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to invite employee' };
  }
}

export async function disableEmployeeAction(userId: string) {
  try {
    await disableEmployee(userId);
    revalidatePath('/employees');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to disable employee' };
  }
}

export async function updateEmployeeRoleAction(userId: string, formData: FormData) {
  try {
    const roleName = formData.get('roleName') as string;
    if (!roleName) throw new Error("Role is required");
    
    await updateEmployeeRole(userId, roleName);
    revalidatePath('/employees');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update role' };
  }
}

export async function reassignDepartmentAction(userId: string, formData: FormData) {
  try {
    const departmentId = formData.get('departmentId') as string;
    if (!departmentId) throw new Error("Department is required");
    
    await reassignDepartment(userId, departmentId);
    revalidatePath('/employees');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to reassign department' };
  }
}

export async function updateProfileAction(userId: string, formData: FormData) {
  try {
    const data = {
      firstName: formData.get('firstName') as string | undefined,
      lastName: formData.get('lastName') as string | undefined,
      phone: formData.get('phone') as string | undefined,
      designation: formData.get('designation') as string | undefined,
      profilePhotoUrl: formData.get('profilePhotoUrl') as string | undefined,
    };
    
    // Clean up empty strings
    Object.keys(data).forEach(key => {
      if ((data as any)[key] === '') (data as any)[key] = undefined;
    });

    await updateProfile(userId, data);
    revalidatePath(`/employees/${userId}`);
    revalidatePath('/employees');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update profile' };
  }
}
