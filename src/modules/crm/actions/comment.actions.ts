'use server';
import { createCRMComment, getCRMComments, updateCRMComment, deleteCRMComment } from '../../core/comments/comment.service';
import { EntityType } from '@prisma/client';

export async function createCRMCommentAction(
  entityType: EntityType,
  entityId: string,
  content: string,
  parentId?: string
) {
  try {
    const result = await createCRMComment(entityType, entityId, content, parentId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCRMCommentsAction(
  entityType: EntityType,
  entityId: string,
  cursor?: string,
  limit?: number
) {
  try {
    const result = await getCRMComments(entityType, entityId, cursor, limit);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCRMCommentAction(commentId: string, content: string) {
  try {
    const result = await updateCRMComment(commentId, content);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCRMCommentAction(commentId: string) {
  try {
    const result = await deleteCRMComment(commentId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
