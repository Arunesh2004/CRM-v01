'use server';

import { createDocument, deleteDocument } from './document.service';
import { revalidatePath } from 'next/cache';
import { requireAuthIdentity, requireTenantFromIdentity } from '@/lib/auth';
import { fileTypeFromBuffer } from 'file-type';
import path from 'path';

function sanitizeFilename(originalName: string) {
  let clean = path.basename(originalName);
  clean = clean.replace(/[\x00-\x1F\x7F]/g, '');
  clean = clean.replace(/[<>:"/\\|?*]/g, '_');
  if (clean.length > 255) {
    const ext = path.extname(clean);
    clean = clean.substring(0, 255 - ext.length) + ext;
  }
  return clean || 'unnamed_file.bin';
}

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp'
];

export async function uploadDocumentAction(formData: FormData) {
  try {
    const file = formData.get('file') as File | null;
    const customerId = formData.get('customerId') as string | null;
    const taskId = formData.get('taskId') as string | null;

    if (!file) {
      return { error: 'No file provided' };
    }

    if (!customerId && !taskId) {
      return { error: 'Document must belong to a Customer or Task' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { error: `File size exceeds the 3MB limit.` };
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const typeResult = await fileTypeFromBuffer(buffer);
    let finalMimeType = file.type;

    if (typeResult) {
      finalMimeType = typeResult.mime;
    } else {
      // file-type could not detect magic bytes. Only accept text/csv or text/plain
      const ext = path.extname(file.name).toLowerCase();
      if ((file.type === 'text/plain' && ext === '.txt') || (file.type === 'text/csv' && ext === '.csv')) {
        finalMimeType = file.type;
      } else {
        return { error: 'File type could not be securely verified.' };
      }
    }

    if (!ALLOWED_MIME_TYPES.includes(finalMimeType)) {
      return { error: `File type ${finalMimeType} is not allowed.` };
    }

    const safeFileName = sanitizeFilename(file.name);

    await createDocument({
      fileName: safeFileName,
      mimeType: finalMimeType,
      sizeBytes: file.size,
      buffer,
      customerId: customerId || undefined,
      taskId: taskId || undefined,
    });

    if (customerId) revalidatePath(`/customers/${customerId}`);
    if (taskId) revalidatePath(`/tasks/${taskId}`);

    return { success: true };
  } catch (error: any) {
    console.error('Upload error:', error);
    return { error: error.message || 'Failed to upload document' };
  }
}

export async function deleteDocumentAction(id: string, customerId?: string, taskId?: string) {
  try {
    await deleteDocument(id);
    if (customerId) revalidatePath(`/customers/${customerId}`);
    if (taskId) revalidatePath(`/tasks/${taskId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Delete error:', error);
    return { error: error.message || 'Failed to delete document' };
  }
}
