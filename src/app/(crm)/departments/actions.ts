'use server';

import { createDepartment, updateDepartment, deleteDepartment } from '@/modules/departments/department.service';
import { revalidatePath } from 'next/cache';

export async function createDepartmentAction(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | undefined;
    
    if (!name) throw new Error("Department name is required");

    await createDepartment(name, description);
    revalidatePath('/departments');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to create department' };
  }
}

export async function updateDepartmentAction(departmentId: string, formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | undefined;
    
    if (!name) throw new Error("Department name is required");

    await updateDepartment(departmentId, name, description);
    revalidatePath('/departments');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update department' };
  }
}

export async function deleteDepartmentAction(departmentId: string) {
  try {
    await deleteDepartment(departmentId);
    revalidatePath('/departments');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete department' };
  }
}
