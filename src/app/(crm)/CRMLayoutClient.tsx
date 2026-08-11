'use client';

import { ReactNode, useState } from 'react';
import { Toaster } from 'sonner';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  CheckSquare,
  Menu,
  Search,
  Bell,
  Building2,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationBell from './NotificationBell';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { UserButton, useUser } from '@clerk/nextjs';
import { QuickAddMenu } from '@/components/ui/QuickAddMenu';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Leads', href: '/leads', icon: Target },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Communications', href: '/communications', icon: Phone },
];

interface CRMLayoutClientProps {
  children: ReactNode;
  tenantName: string;
  userRole: string;
}

export default function CRMLayoutClient({ children, tenantName, userRole }: CRMLayoutClientProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Toaster position="top-right" richColors />
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-primary text-primary-foreground transition-all duration-300 md:relative",
          collapsed ? "w-20" : "w-64",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-4 h-16 border-b border-primary-foreground/10">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-accent text-primary font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            {!collapsed && <span className="font-bold text-lg whitespace-nowrap truncate">{tenantName}</span>}
          </div>
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1 rounded hover:bg-primary-foreground/10"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors whitespace-nowrap",
                  isActive 
                    ? "bg-accent text-primary font-medium shadow-sm" 
                    : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                )}
                title={collapsed ? item.name : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-primary-foreground/10">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground whitespace-nowrap"
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-md text-red-300 hover:bg-red-500/10 hover:text-red-200 cursor-pointer whitespace-nowrap">
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b bg-card">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="md:hidden p-2 -ml-2 rounded-md hover:bg-muted"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative max-w-md w-full hidden sm:block">
              <CommandPalette />
            </div>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-5">
            <QuickAddMenu />
            <NotificationBell />
            <div className="w-px h-6 bg-border hidden sm:block" />
            <div className="flex items-center gap-3 cursor-pointer p-1.5 rounded-md hover:bg-muted">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium leading-none">{user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'}</div>
                <div className="text-xs text-muted-foreground mt-1 capitalize">{userRole.toLowerCase().replace('_', ' ')}</div>
              </div>
              <UserButton />
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
