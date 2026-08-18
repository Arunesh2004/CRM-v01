import { requirePermission } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';

export default async function BillingPlansPage() {
  await requirePermission(Resource.REVENUE, Action.READ);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Billing Plans</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p>Billing plans interface.</p>
      </div>
    </div>
  );
}
