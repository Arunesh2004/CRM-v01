import { requirePermission } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';

export default async function AdminIntegrationsPage() {
  await requirePermission(Resource.SYSTEM, Action.MANAGE_TERRITORIES);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Integrations Management</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Integrations management interface.</p>
      </div>
    </div>
  );
}
