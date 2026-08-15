'use client';

import React, { useState } from 'react';
import { deleteDocumentAction } from '@/modules/crm/document/document.actions';

export interface DocumentInfo {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  uploadedBy?: { email: string };
}

export function DocumentList({
  documents,
  customerId,
  taskId,
}: {
  documents: DocumentInfo[];
  customerId?: string;
  taskId?: string;
}) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    setError(null);
    setIsDeleting(id);
    
    try {
      const result = await deleteDocumentAction(id, customerId, taskId);
      if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setIsDeleting(null);
    }
  };

  if (!documents || documents.length === 0) {
    return <p className="text-sm text-gray-500 mt-4">No documents uploaded yet.</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">{doc.fileName}</span>
            <div className="flex gap-2 text-xs text-gray-500 mt-1">
              <span>{formatSize(doc.sizeBytes)}</span>
              <span>•</span>
              <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
              {doc.uploadedBy && (
                <>
                  <span>•</span>
                  <span>Uploaded by {doc.uploadedBy.email}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <a
              href={`/api/documents/${doc.id}/download`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
            >
              Download
            </a>
            <button
              onClick={() => handleDelete(doc.id)}
              disabled={isDeleting === doc.id}
              className={`px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors ${
                isDeleting === doc.id ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {isDeleting === doc.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
