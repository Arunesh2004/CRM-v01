"use client";

import { ReactNode, useState } from "react";
import { Toaster } from "sonner";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Target,
  CheckSquare,
  Menu,
  MessageSquare,
  Phone,
  Camera,
  AlertTriangle,
  BarChart3,
  Settings,
  Shield,
  MapPin,
  Sparkles,
  LogOut,
  ChevronDown,
  Search,
  X,
  Activity,
  UserCog,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { UserButton, useUser } from "@clerk/nextjs";
import { QuickAddMenu } from "@/components/ui/QuickAddMenu";
import { AssistantPopup } from "@/components/ai/AssistantPopup";

// Navigation grouped as per Nexus CRM reference
const NAV_GROUPS = [
  {
    section: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    section: "CRM",
    items: [
      { name: "Leads", href: "/leads", icon: Target },
      { name: "Customers", href: "/customers", icon: Users },
      { name: "Deals", href: "/deals", icon: BarChart3 },
      { name: "Quotes", href: "/quotes", icon: BarChart3 },
      { name: "Territories", href: "/territories", icon: MapPin },
      { name: "Locations", href: "/locations", icon: MapPin },
    ],
  },
  {
    section: "Workspace",
    items: [
      { name: "Tasks", href: "/tasks", icon: CheckSquare },
      { name: "Tickets", href: "/tickets", icon: MessageSquare },
      { name: "Chat", href: "/chat", icon: MessageSquare },
      { name: "Communications", href: "/communications", icon: Phone },
    ],
  },
  {
    section: "Security Ops",
    items: [
      { name: "Cameras", href: "/cameras", icon: Camera },
      { name: "Incidents", href: "/incidents", icon: AlertTriangle },
      { name: "Monitoring", href: "/monitoring", icon: Activity },
    ],
  },
  {
    section: "Insights",
    items: [
      { name: "Reports", href: "/reports", icon: BarChart3 },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
      { name: "AI Assistant", href: "/assistant", icon: Sparkles },
    ],
  },
  {
    section: "System",
    items: [
      { name: "Approvals", href: "/admin/approvals", icon: Shield },
      { name: "Settings", href: "/settings/employees", icon: Settings },
      { name: "Admin", href: "/admin", icon: Shield, adminOnly: true },
    ],
  },
];

// Which nav items require admin/department_head to see
const ADMIN_ROLES = ["ADMIN", "DEPARTMENT_HEAD", "OWNER"];

interface CRMLayoutClientProps {
  children: ReactNode;
  tenantName: string;
  userRole: string;
  initialNotifications?: any[];
  initialNotificationCount?: number;
}

export default function CRMLayoutClient({
  children,
  tenantName,
  userRole,
  initialNotifications = [],
  initialNotificationCount = 0,
}: CRMLayoutClientProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = ADMIN_ROLES.includes(userRole?.toUpperCase());

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--ink-950)" }}>
      <Toaster position="top-right" richColors theme="dark" />

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ============================================================
          SIDEBAR — Nexus CRM visual pattern
          ============================================================ */}
      <aside
        className={cn(
          "glass-panel fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col border-r transition-transform duration-300",
          "border-white/5",
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <div className="w-9 h-9 rounded-xl grad-primary flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 17L10 5L14 13L17 7L20 17"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-[15px] leading-none text-white">
              {tenantName.length > 14 ? tenantName.slice(0, 14) + "…" : tenantName}
              <span className="grad-text">CRM</span>
            </p>
            <p className="text-[10px] mt-1" style={{ color: "#8891B0" }}>
              Security Suite
            </p>
          </div>
          {/* Mobile close */}
          <button
            className="lg:hidden ml-auto w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
          {NAV_GROUPS.map((group) => {
            // Filter adminOnly items unless user is admin
            const visibleItems = group.items.filter(
              (item: any) => !item.adminOnly || isAdmin
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.section}>
                <p className="sidebar-section-label">{group.section}</p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn("nav-item", active && "active")}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom user info */}
        <div className="px-3 pb-4">
          <div
            className="glass-panel rounded-xl p-3 flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-full grad-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(user?.firstName?.[0] || user?.primaryEmailAddress?.emailAddress?.[0] || "U").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate text-white">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress || "User"}
              </p>
              <p className="text-[10px] capitalize" style={{ color: "#8891B0" }}>
                {userRole.toLowerCase().replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================
          MAIN — Topbar + Content
          ============================================================ */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header
          className="glass-panel flex items-center gap-4 px-4 sm:px-6 py-3 border-b border-white/5 relative z-20 shrink-0"
        >
          {/* Mobile menu btn */}
          <button
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg glass"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Page title area */}
          <div className="hidden sm:block">
            <h1 className="font-display font-bold text-lg leading-tight text-white">
              {/* dynamically derived from pathname */}
              {getPageTitle(pathname)}
            </h1>
          </div>

          {/* Search bar — command palette trigger */}
          <div className="hidden md:flex items-center relative flex-1 max-w-md ml-4">
            <CommandPalette />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            {/* Quick add */}
            <QuickAddMenu />

            {/* AI assistant trigger */}
            <button
              className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg glass card-hover"
              title="AI Assistant"
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
            </button>

            {/* Notification bell */}
            <NotificationBell
              initialNotifications={initialNotifications}
              initialNotificationCount={initialNotificationCount}
            />

            {/* Divider */}
            <div className="w-px h-5 bg-white/10 hidden sm:block" />

            {/* User profile */}
            <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg glass card-hover cursor-pointer">
              <div className="w-7 h-7 rounded-full grad-primary flex items-center justify-center text-white text-[10px] font-bold ring-glow">
                {(user?.firstName?.[0] || "U").toUpperCase()}
              </div>
              <span className="hidden lg:block text-left">
                <span className="block text-xs font-semibold leading-none text-white">
                  {user?.firstName || "User"}
                </span>
              </span>
              <UserButton />
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </div>
      </main>

      <AssistantPopup />
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";
  const segment = segments[segments.length - 1];
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    customers: "Customers",
    leads: "Lead Management",
    deals: "Deals",
    tasks: "Tasks",
    chat: "Chat",
    communications: "Communications",
    cameras: "CCTV Cameras",
    incidents: "Incidents",
    monitoring: "Live Monitoring",
    reports: "Reports",
    analytics: "Analytics",
    assistant: "AI Assistant",
    settings: "Settings",
    admin: "Administration",
    locations: "Locations",
    notifications: "Notifications",
    search: "Search",
    billing: "Billing",
    audit: "Audit Log",
    employees: "Team",
    integrations: "Integrations",
    permissions: "Permissions",
    users: "Users",
    workload: "Task Workload",
    inbox: "Inbox",
  };
  return titles[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
}
