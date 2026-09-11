import { Suspense } from "react";
import { getLeadsAction } from "@/modules/crm/actions/lead.actions";
import { LeadForm } from "@/components/crm/LeadForm";
import { withTenant } from "@db/utils/prisma-tenant";
import { requireTenant } from "@/lib/auth";
import { Skeleton } from "@/components/ui/Skeleton";
import { FilterBar } from "@/components/crm/FilterBar";

import { KanbanBoardClientWrapper as KanbanBoard } from "@/components/crm/KanbanBoardClientWrapper";



const STATUS_COLUMNS = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

export default async function LeadsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const search =
    typeof searchParams.search === "string" ? searchParams.search : undefined;
  const status =
    typeof searchParams.status === "string" ? searchParams.status : undefined;
  const assignedUserId =
    typeof searchParams.owner === "string" ? searchParams.owner : undefined;
  const cursor =
    typeof searchParams.cursor === "string" ? searchParams.cursor : undefined;

  const result = await getLeadsAction({
    search,
    cursor,
    limit: 50,
    filters: {
      ...(status ? { status } : {}),
      ...(assignedUserId ? { assignedUserId } : {}),
    },
  });
  const resData = result.success ? result.data || [] : [];

  const leads = Array.isArray(resData) ? resData : resData.data || [];
    const pagination = !Array.isArray(resData) ? resData.pagination : null;

  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      clerkId: { not: { startsWith: "SYSTEM_" } },
    },
    select: { id: true, email: true },
  });

  return (
    <div className="space-y-6 h-full flex flex-col animate-in">
      {/* Page header */}
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white">Leads Pipeline</p>
          <p className="text-sm mt-1" style={{ color: '#8891B0' }}>Track and convert incoming regional prospects.</p>
        </div>
        <div className="shrink-0">
          <LeadForm />
        </div>
      </div>

      <div className="mb-2">
        <div className="mb-2">
          <FilterBar
            filters={[
              {
                key: 'status',
                label: 'Status',
                options: STATUS_COLUMNS.map(s => ({ label: s.charAt(0) + s.slice(1).toLowerCase(), value: s }))
              },
              {
                key: 'owner',
                label: 'Owner',
                options: users.map(u => ({ label: u.email.split('@')[0], value: u.id }))
              }
            ]}
          />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <Suspense
          fallback={
            <div className="flex space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-80 space-y-4 shrink-0">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ))}
            </div>
          }
        >
          <KanbanBoard initialLeads={leads} users={users} />
        </Suspense>
        {/* Pagination can be implemented here later */}
      </div>
    </div>
  );
}
