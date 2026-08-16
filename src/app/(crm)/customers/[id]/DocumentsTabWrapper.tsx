import { Suspense } from 'react';
import { getDocumentsForCustomer } from '@/modules/crm/document/document.service';
import { DocumentList } from '@/components/crm/DocumentList';
import { DocumentUploader } from '@/components/crm/DocumentUploader';

export async function DocumentsTabWrapper({ customerId }: { customerId: string }) {
  const documents = await getDocumentsForCustomer(customerId);
  
  return (
    <div className="glass-panel p-6 flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-display font-semibold text-white">Documents</h3>
          <p className="text-sm text-[#8891B0] mt-0.5">Manage and attach files relevant to this customer.</p>
        </div>
        <DocumentUploader customerId={customerId} />
      </div>
      <DocumentList documents={documents as any} customerId={customerId} />
    </div>
  );
}
