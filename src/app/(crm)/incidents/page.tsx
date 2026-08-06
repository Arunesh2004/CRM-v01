import { Suspense } from 'react';
import { getIncidentsAction } from '@/modules/incident/actions/incident.actions';
import { IncidentClientTable } from '@/components/incident/IncidentClientTable';

export default async function IncidentsPage() {
  const result = await getIncidentsAction();
  const incidents = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Security Incidents</h1>
      </div>
      
      <Suspense fallback={<div>Loading incidents...</div>}>
        <IncidentClientTable incidents={incidents} />
      </Suspense>
    </div>
  );
}
