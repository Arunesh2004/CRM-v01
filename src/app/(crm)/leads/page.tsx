import { Suspense } from "react";
import { getLeadsAction } from "@/modules/crm/actions/lead.actions";
import { LeadForm } from "@/components/crm/LeadForm";
import { StatusUpdater } from "@/components/crm/StatusUpdater";
import { LeadActions } from "@/components/crm/LeadActions";
import { withTenant } from "@/../database/utils/prisma-tenant";
import { requireTenant } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Target, Mail, User2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

import { KanbanBoardClientWrapper as KanbanBoard } from "@/components/crm/KanbanBoardClientWrapper";

const STATUS_COLUMNS = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
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
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Leads Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and convert incoming regional prospects.
          </p>
        </div>
        <div className="shrink-0">
          <LeadForm />
        </div>
      </div>

      <div className="mb-2">
        <div className="mb-2">
          {/* Filtering can be implemented here later */}
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
