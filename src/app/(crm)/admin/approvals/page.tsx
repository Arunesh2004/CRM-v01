import { ApprovalService } from '@/modules/approvals/approval.service';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const tenantId = await requireTenant();
  const user = await requireAuth();
  
  // Checking SYSTEM:READ or similar appropriate permission
  await requirePermission(Resource.SYSTEM, Action.READ);

  const approvals = await ApprovalService.getPendingApprovals(tenantId, user.id);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Pending Approvals</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {approvals.map((approval: any) => (
              <tr key={approval.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{approval.resource}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{approval.resourceId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{approval.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(approval.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {approvals.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No pending approvals.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
