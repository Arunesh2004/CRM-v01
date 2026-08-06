import { Suspense } from 'react';
import { getLeadsAction } from '@/modules/crm/actions/lead.actions';
import { LeadForm } from '@/components/crm/LeadForm';
import { StatusUpdater } from '@/components/crm/StatusUpdater';

const STATUS_COLUMNS = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];

export default async function LeadsPage() {
  const result = await getLeadsAction();
  const leads = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Leads Pipeline</h1>
        <LeadForm />
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <Suspense fallback={<div>Loading Kanban board...</div>}>
          <div className="flex space-x-4 h-full pb-4 min-w-max">
            
            {leads.length === 0 && (
              <div className="w-full h-32 flex items-center justify-center text-gray-500 bg-gray-50 border rounded border-dashed">
                No leads found. Create your first lead to start the pipeline!
              </div>
            )}

            {leads.length > 0 && STATUS_COLUMNS.map(status => {
              const columnLeads = leads.filter((l: any) => l.status === status);
              return (
                <div key={status} className="w-80 bg-gray-50 rounded shadow flex flex-col h-[70vh]">
                  <div className="p-3 font-semibold border-b bg-gray-100 flex justify-between">
                    <span>{status}</span>
                    <span className="text-sm bg-gray-200 text-gray-700 px-2 rounded-full">{columnLeads.length}</span>
                  </div>
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                    {columnLeads.map((lead: any) => (
                      <div key={lead.id} className="bg-white p-3 rounded shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium truncate pr-2">{lead.company || lead.name}</div>
                          <StatusUpdater leadId={lead.id} currentStatus={lead.status} />
                        </div>
                        <div className="text-sm text-gray-500 truncate">{lead.name}</div>
                        {lead.email && <div className="text-xs text-gray-400 truncate">{lead.email}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
          </div>
        </Suspense>
      </div>
    </div>
  );
}
