import { Suspense } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/Badge";
import {
  getDealsAction,
  getPipelinesAction,
  getDealAnalyticsAction,
  seedDefaultPipelineAction,
} from "@/modules/crm/actions/deal.actions";
import { requireTenant } from "@/lib/auth";
import { DealKanbanBoardClientWrapper as DealKanbanBoard } from "./DealKanbanBoardClientWrapper";
import { DollarSign, Percent, TrendingUp, AlertCircle } from "lucide-react";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const tenantId = await requireTenant();

  // Ensure default pipeline exists
  await seedDefaultPipelineAction(tenantId);

  const pipelineRes = await getPipelinesAction();
  const pipelines: any[] =
    pipelineRes.success && pipelineRes.data ? pipelineRes.data : [];

  if (pipelines.length === 0) {
    return <div>Error loading pipelines</div>;
  }

  const selectedPipelineId =
    typeof searchParams.pipeline === "string"
      ? searchParams.pipeline
      : pipelines[0]?.id;
  const pipeline =
    pipelines.find((p: any) => p.id === selectedPipelineId) || pipelines[0];

  const analyticsRes = await getDealAnalyticsAction();
  const metrics = analyticsRes.success ? analyticsRes.data : null;

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deals Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Manage opportunities and revenue forecasts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Pipeline Selector could go here */}
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background"
            defaultValue={pipeline.id}
          >
            {pipelines.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button>Create Deal</Button>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pipeline Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${metrics.totalPipelineValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Weighted Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${metrics.weightedPipelineValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.winRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Won Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${metrics.wonRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-hidden">
        <DealKanbanBoard pipeline={pipeline} />
      </div>
    </div>
  );
}
