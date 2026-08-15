import { Suspense } from 'react';
import { getCustomersAction } from '@/modules/crm/actions/customer.actions';
import { CustomerForm } from '@/components/crm/CustomerForm';
import Link from 'next/link';
import { CustomerActions } from '@/components/crm/CustomerActions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/crm/FilterBar';
import { PaginationButton } from '@/components/crm/PaginationButton';
import { Skeleton } from '@/components/ui/Skeleton';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const search   = typeof searchParams.search   === 'string' ? searchParams.search   : undefined;
  const status   = typeof searchParams.status   === 'string' ? searchParams.status   : undefined;
  const industry = typeof searchParams.industry === 'string' ? searchParams.industry : undefined;
  const cursor   = typeof searchParams.cursor   === 'string' ? searchParams.cursor   : undefined;

  const result = await getCustomersAction({
    search,
    cursor,
    limit: 50,
    filters: {
      ...(status   ? { status }   : {}),
      ...(industry ? { industry } : {}),
    },
  });

  const resData   = result.success ? (result.data || []) : [];
  const customers = Array.isArray(resData) ? resData : (resData.data || []);
  const pagination = !Array.isArray(resData) ? resData.pagination : null;

  return (
    <div className="space-y-6 animate-in">

      {/* ─── Page header ─── */}
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white">Enterprise Customers</p>
          <p className="text-sm mt-1" style={{ color: '#8891B0' }}>
            Manage your B2B accounts and relationships.
          </p>
        </div>
        <div className="shrink-0">
          <CustomerForm />
        </div>
      </div>

      {/* ─── Table panel ─── */}
      <div
        className="rounded-[1.1rem] border border-white/[.08] overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(27,35,64,.65), rgba(13,19,38,.65))',
          boxShadow: '0 8px 32px rgba(0,0,0,.35)',
        }}
      >
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-white/[.05]">
          <p className="font-display font-semibold text-white">Customer Directory</p>
          <FilterBar
            filters={[
              {
                key: 'status',
                label: 'All Statuses',
                options: [
                  { label: 'Active',   value: 'ACTIVE'   },
                  { label: 'Inactive', value: 'INACTIVE' },
                  { label: 'Pending',  value: 'PENDING'  },
                ],
              },
              {
                key: 'industry',
                label: 'All Industries',
                options: [
                  { label: 'Technology', value: 'Technology' },
                  { label: 'Finance',    value: 'Finance'    },
                  { label: 'Healthcare', value: 'Healthcare' },
                  { label: 'Retail',     value: 'Retail'     },
                ],
              },
            ]}
          />
        </div>

        {/* Table */}
        <Suspense
          fallback={
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr className="text-left border-b border-white/[.05]">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4 hidden md:table-cell">Industry</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <EmptyState
                        title="No Customers Found"
                        description="Your CRM is ready. Add your first enterprise customer to begin."
                        icon={<Users className="w-6 h-6" />}
                      />
                    </td>
                  </tr>
                )}
                {customers.map((customer: any) => (
                  <tr
                    key={customer.id}
                    className="border-b border-white/[.05] last:border-0 group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg,#7C5CFC,#9B7BFF)' }}
                        >
                          {customer.name?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <p className="font-medium text-white">{customer.name}</p>
                          <p className="text-xs text-slate-400 md:hidden">{customer.industry || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-400">
                      {customer.industry || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={customer.status === 'ACTIVE' ? 'emerald' : 'slate'}>
                        {customer.status?.replace(/_/g, ' ') || 'Active'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/customers/${customer.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                        <CustomerActions customerId={customer.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-3 text-xs border-t border-white/[.05]"
            style={{ color: '#8891B0' }}
          >
            <span>Showing {customers.length} customers</span>
          </div>

          {pagination && (
            <PaginationButton
              hasMore={pagination.hasMore}
              nextCursor={pagination.nextCursor}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}
