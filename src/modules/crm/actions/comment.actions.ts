'use server';
import { withServerActionContext } from '@/lib/observability/server-action';
import { sanitizeClientError } from '@/lib/errors/client-safe-error';

import { createCRMComment, getCRMComments, updateCRMComment, deleteCRMComment } from '../../core/comments/comment.service';
import { EntityType } from '@prisma/client';

async function _createCRMCommentAction(
  entityType: EntityType,
  entityId: string,
  content: string,
  parentId?: string
) {
  try {
    const result = await createCRMComment(entityType, entityId, content, parentId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _getCRMCommentsAction(
  entityType: EntityType,
  entityId: string,
  cursor?: string,
  limit?: number
) {
  try {
    const result = await getCRMComments(entityType, entityId, cursor, limit);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _updateCRMCommentAction(commentId: string, content: string) {
  try {
    const result = await updateCRMComment(commentId, content);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

async function _deleteCRMCommentAction(commentId: string) {
  try {
    const result = await deleteCRMComment(commentId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: sanitizeClientError(error) };
  }
}

export const createCRMCommentAction = withServerActionContext(_createCRMCommentAction);

export const getCRMCommentsAction = withServerActionContext(_getCRMCommentsAction);

export const updateCRMCommentAction = withServerActionContext(_updateCRMCommentAction);

export const deleteCRMCommentAction = withServerActionContext(_deleteCRMCommentAction);
