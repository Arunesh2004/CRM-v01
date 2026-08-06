'use server'

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateTaskSchema, UpdateTaskSchema } from '../validators/task.schema';
import * as taskService from '../task/task.service';
import { z } from 'zod';

export async function createTaskAction(payload: z.infer<typeof CreateTaskSchema>) {
  try {
    const validatedData = CreateTaskSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('TASK', 'CREATE');
    const result = await taskService.createTask(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTaskAction(payload: z.infer<typeof UpdateTaskSchema>) {
  try {
    const validatedData = UpdateTaskSchema.parse(payload);
    await requireAuth();
    await requireTenant();
    await requirePermission('TASK', 'UPDATE');
    const result = await taskService.updateTask(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTasksAction() {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('TASK', 'READ');
    const result = await taskService.getTasks();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
