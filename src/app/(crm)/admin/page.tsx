import { requireAuth, requireTenant } from '@/lib/auth';
import prisma from '@/../database/utils/prisma';

export default async function AdminDashboardPage() {
  await requireAuth();
  const tenantId = await requireTenant();
  
  // Fetch tenant info to ensure Tenant A only sees Tenant A's info
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    return <div>Tenant not found</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Workspace Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="font-semibold text-lg mb-4 border-b pb-2">Company Information</h2>
          <div className="space-y-3 text-sm">
             <div><span className="font-medium text-gray-600">Company Name:</span> {tenant.name}</div>
             <div><span className="font-medium text-gray-600">Tenant ID:</span> {tenant.id}</div>
             <div><span className="font-medium text-gray-600">Industry:</span> Technology</div>
             <div><span className="font-medium text-gray-600">Timezone:</span> UTC-5 (EST)</div>
          </div>
          <button className="mt-4 px-4 py-2 border rounded text-sm font-medium hover:bg-gray-50">Edit Profile</button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="font-semibold text-lg mb-4 border-b pb-2">Security Status</h2>
          <div className="space-y-3 text-sm">
             <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600">Require 2FA for all members:</span>
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Enabled</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600">Single Sign-On (SAML):</span>
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">Not Configured</span>
             </div>
             <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600">Session Timeout:</span>
                <span className="text-gray-800">4 Hours</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
