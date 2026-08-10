import { Suspense } from 'react';
import { getCustomersAction } from '@/modules/crm/actions/customer.actions';
import { CustomerForm } from '@/components/crm/CustomerForm';
import Link from 'next/link';
import { CustomerActions } from '@/components/crm/CustomerActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Search, Filter, ArrowUpDown, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterBar } from '@/components/crm/FilterBar';
import { PaginationButton } from '@/components/crm/PaginationButton';
import { Skeleton } from '@/components/ui/Skeleton';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const industry = typeof searchParams.industry === 'string' ? searchParams.industry : undefined;
  const cursor = typeof searchParams.cursor === 'string' ? searchParams.cursor : undefined;

  const result = await getCustomersAction({
    search,
    cursor,
    limit: 50,
    filters: {
      ...(status ? { status } : {}),
      ...(industry ? { industry } : {}),
    }
  });
  
  const resData = result.success ? (result.data || []) : [];
  const customers = Array.isArray(resData) ? resData : (resData.data || []);
  const pagination = !Array.isArray(resData) ? resData.pagination : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Enterprise Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your B2B accounts and relationships.</p>
        </div>
        <div className="shrink-0">
          <CustomerForm />
        </div>
      </div>
      
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
          <CardTitle className="text-lg">Customer Directory</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <FilterBar 
            filters={[
              {
                key: 'status',
                label: 'All Statuses',
                options: [
                  { label: 'Active', value: 'ACTIVE' },
                  { label: 'Inactive', value: 'INACTIVE' },
                  { label: 'Pending', value: 'PENDING' }
                ]
              },
              {
                key: 'industry',
                label: 'All Industries',
                options: [
                  { label: 'Technology', value: 'Technology' },
                  { label: 'Finance', value: 'Finance' },
                  { label: 'Healthcare', value: 'Healthcare' },
                  { label: 'Retail', value: 'Retail' }
                ]
              }
            ]}
          />
          <Suspense fallback={
            <div className="space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          }>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted text-muted-foreground">
                  <tr className="border-b">
                    <th className="font-medium p-4">Company Name</th>
                    <th className="font-medium p-4 hidden md:table-cell">Industry</th>
                    <th className="font-medium p-4">Status</th>
                    <th className="font-medium p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-0">
                        <EmptyState 
                          title="No Customers Found" 
                          description="Your CRM is ready. Add your first enterprise customer to begin."
                          icon={<Users className="w-12 h-12 opacity-50" />}
                          className="border-0 bg-transparent py-12"
                        />
                      </td>
                    </tr>
                  )}
                  {customers.map((customer: any) => (
                    <tr key={customer.id} className="hover:bg-muted/50 transition-colors group">
                      <td className="p-4">
                        <div className="font-medium text-foreground max-w-[200px] sm:max-w-[300px] truncate" title={customer.name}>
                          {customer.name}
                        </div>
                        <div className="text-xs text-muted-foreground md:hidden mt-1">{customer.industry || '-'}</div>
                      </td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{customer.industry || '-'}</td>
                      <td className="p-4">
                        <Badge variant={customer.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {customer.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
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
            
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground px-2">
              <div>Showing {customers.length} records</div>
            </div>
            {pagination && (
              <PaginationButton 
                hasMore={pagination.hasMore} 
                nextCursor={pagination.nextCursor} 
              />
            )}
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
