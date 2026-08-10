'use server'

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateTaskSchema, UpdateTaskSchema } from '../validators/task.schema';
import * as taskService from '../task/task.service';
import { createCRMComment, deleteCRMComment } from '@/modules/core/comments/comment.service';
import { z } from 'zod';
import { QueryParams } from '../../core/types';

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

export async function getTasksAction(params?: QueryParams & {
  priority?: string;
  customerId?: string;
  leadId?: string;
  dueDateStart?: Date;
  dueDateEnd?: Date;
}) {
  try {
    await requireAuth();
    await requireTenant();
    await requirePermission('TASK', 'READ');
    
    const result = await taskService.getTasks(params);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTaskByIdAction(taskId: string) {
  try {
    const result = await taskService.getTaskById(taskId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTaskCommentAction(taskId: string, content: string) {
  try {
    const result = await createCRMComment('TASK', taskId, content);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTaskCommentAction(commentId: string) {
  try {
    const result = await deleteCRMComment(commentId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTaskWorkloadMetricsAction() {
  try {
    const result = await taskService.getTaskWorkloadMetrics();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
