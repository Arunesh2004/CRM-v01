import { Suspense } from "react";
import { requireAuth, requireTenant } from "@/lib/auth";
import { withTenant } from "@/../database/utils/prisma-tenant";
import { getDashboardAnalytics } from "@/modules/analytics/analytics.service";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Users,
  Target,
  CheckSquare,
  Phone,
  MessageSquare,
  AlertTriangle,
  Activity,
  Mail,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { SalesChartClientWrapper as SalesChart } from "@/components/ui/SalesChartClientWrapper";

// ── Nexus CRM color palette
const colorMap: Record<string, string> = {
  violet: "#7C5CFC",
  cyan: "#22D3EE",
  emerald: "#10B981",
  amber: "#F5A623",
  rose: "#F43F5E",
};

// KPI card definition
interface KpiDef {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: keyof typeof colorMap;
  href?: string;
}

function KpiCard({ kpi }: { kpi: KpiDef }) {
  const hex = colorMap[kpi.color] ?? colorMap.violet;
  const Icon = kpi.icon;
  const content = (
    <div
      className="kpi-card glass-panel p-4 card-hover animate-in h-full"
      style={{ animationDelay: "0ms" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${hex}1F` }}
        >
          <Icon className="w-4 h-4" style={{ color: hex }} />
        </div>
      </div>
      <p className="font-display font-bold text-xl text-white font-mono">
        {typeof kpi.value === "number" ? kpi.value.toLocaleString("en-IN") : kpi.value}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "#8891B0" }}>
        {kpi.label}
      </p>
    </div>
  );

  if (kpi.href) {
    return <Link href={kpi.href} className="block h-full">{content}</Link>;
  }
  return content;
}

export default async function DashboardPage() {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const [
    customerCount,
    activeLeadsCount,
    pendingTasksCount,
    callCount,
    messageCount,
    emailCount,
    incidentCount,
    recentActivities,
  ] = await Promise.all([
    prisma.customer.count({ where: { tenantId, deletedAt: null } }),
    prisma.lead.count({ where: { tenantId, status: { notIn: ["LOST", "CONVERTED"] } } }),
    prisma.task.count({ where: { tenantId, status: "PENDING" } }),
    prisma.callLog.count({ where: { tenantId } }),
    prisma.chatMessage.count({ where: { tenantId } }),
    prisma.mailMessage.count({ where: { tenantId } }),
    prisma.incident.count({ where: { tenantId } }),
    prisma.activityTimeline.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { actor: true },
    }),
  ]);

  const analyticsData = await getDashboardAnalytics(tenantId, 6);

  const kpis: KpiDef[] = [
    { label: "Total Customers", value: customerCount, icon: Users, color: "cyan", href: "/customers" },
    { label: "Active Leads", value: activeLeadsCount, icon: Target, color: "violet", href: "/leads" },
    { label: "Pending Tasks", value: pendingTasksCount, icon: CheckSquare, color: "emerald", href: "/tasks" },
    { label: "Total Calls", value: callCount, icon: Phone, color: "amber" },
    { label: "Total Emails", value: emailCount, icon: Mail, color: "violet" },
    { label: "Total Messages", value: messageCount, icon: MessageSquare, color: "cyan" },
    { label: "Security Incidents", value: incidentCount, icon: AlertTriangle, color: "rose", href: "/incidents" },
  ];

  return (
    <div className="space-y-6 animate-in">

      {/* ── Welcome strip */}
      <div className="glass-panel rounded-[1.25rem] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white">
            Command Center 🛡️
          </p>
          <p className="text-sm mt-1" style={{ color: "#8891B0" }}>
            Real-time operations overview for your security deployment.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/leads" className="btn-primary text-sm">
            <Target className="w-4 h-4" />
            View Leads
          </Link>
        </div>
      </div>

      {/* ── KPI grid — 4 columns on large screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={kpi.label} className="animate-in" style={{ animationDelay: `${i * 40}ms` }}>
            <KpiCard kpi={kpi} />
          </div>
        ))}
      </div>

      {/* ── Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue / Sales Trend */}
        <div className="lg:col-span-2 glass-panel rounded-[1.1rem] p-5 card-hover animate-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-display font-semibold text-white">Sales Trend</p>
              <p className="text-xs mt-0.5" style={{ color: "#8891B0" }}>
                Last 6 months
              </p>
            </div>
            <span className="badge badge-emerald">
              <TrendingUp className="w-2.5 h-2.5" />
              Live
            </span>
          </div>
          <div className="h-56">
            <SalesChart data={analyticsData} />
          </div>
        </div>

        {/* Activity feed */}
        <div className="glass-panel rounded-[1.1rem] p-5 animate-in flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-semibold text-white">Recent Activity</p>
            <Link
              href="/reports"
              className="text-[11px] font-medium"
              style={{ color: "var(--violet)" }}
            >
              View report
            </Link>
          </div>

          <Suspense
            fallback={
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg skeleton shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3 skeleton rounded-full" />
                      <div className="h-2.5 skeleton rounded-full w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            }
          >
            {recentActivities.length === 0 ? (
              <EmptyState
                title="No Activity Yet"
                description="Team operations will appear here."
                icon={<Activity className="w-6 h-6" />}
              />
            ) : (
              <div className="space-y-1 flex-1 overflow-y-auto">
                {recentActivities.map((activity: any, idx: number) => {
                  const colors = [colorMap.violet, colorMap.cyan, colorMap.emerald, colorMap.amber, colorMap.rose];
                  const hex = colors[idx % colors.length];
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 py-2.5 border-b last:border-0"
                      style={{ borderColor: "rgba(255,255,255,.05)" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${hex}1F` }}
                      >
                        <Activity className="w-3.5 h-3.5" style={{ color: hex }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white leading-snug">
                          <span className="font-medium">
                            {activity.actor?.email?.split("@")[0] || "System"}
                          </span>{" "}
                          <span style={{ color: "#8891B0" }}>{activity.content}</span>
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: "#8891B0" }}>
                          {new Date(activity.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
