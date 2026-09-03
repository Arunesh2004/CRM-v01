'use server'
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { CreateTaskSchema, UpdateTaskSchema } from '../validators/task.schema';
import * as taskService from '../task/task.service';
import { createCRMComment, deleteCRMComment } from '@/modules/core/comments/comment.service';
import { z } from 'zod';
import { QueryParams } from '../../core/types';

async function _createTaskAction(payload: z.infer<typeof CreateTaskSchema>) {
  try {
    const validatedData = CreateTaskSchema.parse(payload);
    const result = await taskService.createTask(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _updateTaskAction(payload: z.infer<typeof UpdateTaskSchema>) {
  try {
    const validatedData = UpdateTaskSchema.parse(payload);
    const result = await taskService.updateTask(validatedData);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getTasksAction(params?: QueryParams & {
  priority?: string;
  customerId?: string;
  leadId?: string;
  dueDateStart?: Date;
  dueDateEnd?: Date;
}) {
  try {
    const result = await taskService.getTasks(params);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getTaskByIdAction(taskId: string) {
  try {
    const result = await taskService.getTaskById(taskId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _createTaskCommentAction(taskId: string, content: string) {
  try {
    const result = await createCRMComment('TASK', taskId, content);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _deleteTaskCommentAction(commentId: string) {
  try {
    const result = await deleteCRMComment(commentId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getTaskWorkloadMetricsAction() {
  try {
    const result = await taskService.getTaskWorkloadMetrics();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const createTaskAction = withServerActionContext(_createTaskAction);

export const updateTaskAction = withServerActionContext(_updateTaskAction);

export const getTasksAction = withServerActionContext(_getTasksAction);

export const getTaskByIdAction = withServerActionContext(_getTaskByIdAction);

export const createTaskCommentAction = withServerActionContext(_createTaskCommentAction);

export const deleteTaskCommentAction = withServerActionContext(_deleteTaskCommentAction);

export const getTaskWorkloadMetricsAction = withServerActionContext(_getTaskWorkloadMetricsAction);
