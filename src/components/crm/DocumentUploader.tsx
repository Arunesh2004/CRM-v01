'use client';

import React, { useState } from 'react';
import { uploadDocumentAction } from '@/modules/crm/document/document.actions';

export function DocumentUploader({
  customerId,
  taskId,
  onUploadSuccess,
}: {
  customerId?: string;
  taskId?: string;
  onUploadSuccess?: () => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (customerId) formData.append('customerId', customerId);
    if (taskId) formData.append('taskId', taskId);

    try {
      const result = await uploadDocumentAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        if (onUploadSuccess) onUploadSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
      // reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex items-center gap-4">
        <label
          htmlFor="document-upload"
          className={`cursor-pointer px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors ${
            isUploading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </label>
        <input
          id="document-upload"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-500">Max file size: 3MB. Supported formats: PDF, Word, Excel, PowerPoint, Text, Images.</p>
    </div>
  );
}
