import { Suspense } from 'react';
import { getDocumentsForTask } from '@/modules/crm/document/document.service';
import { DocumentList } from '@/components/crm/DocumentList';
import { DocumentUploader } from '@/components/crm/DocumentUploader';

export async function TaskDocumentsWrapper({ taskId }: { taskId: string }) {
  const documents = await getDocumentsForTask(taskId);
  
  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Task Attachments</h3>
          <p className="text-sm text-[#8891B0]">Files and documents related to this task.</p>
        </div>
        <DocumentUploader taskId={taskId} />
      </div>
      <DocumentList documents={documents as any} taskId={taskId} />
    </div>
  );
}
