'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Building2, Users, Shield, Plug, CreditCard, User2, MapPin, Lock, Webhook, IndianRupee } from 'lucide-react';

type TabType = 'organization' | 'people' | 'security' | 'integrations' | 'billing';

export function AdminClientTabs({ 
  tenant, 
  users, 
  roles,
  subscriptions
}: { 
  tenant: any, 
  users: any[], 
  roles: any[],
  subscriptions: any[]
}) {
  const [activeTab, setActiveTab] = useState<TabType>('organization');

  const tabs = [
    { id: 'organization', label: 'Organization Profile', icon: Building2 },
    { id: 'people', label: 'People & Roles', icon: Users },
    { id: 'security', label: 'Security Controls', icon: Shield },
    { id: 'integrations', label: 'Connected Services', icon: Plug },
    { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
  ];

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-500 min-h-[calc(100vh-10rem)]">
      
      {/* LEFT SETTINGS NAVIGATION */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors border-l-4 ${
                isActive 
                ? 'bg-primary/5 text-primary border-primary' 
                : 'text-muted-foreground border-transparent hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 bg-white border rounded-xl shadow-sm p-6 lg:p-8 relative overflow-hidden">
        
        {/* 1. ORGANIZATION */}
        {activeTab === 'organization' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary tracking-tight">Organization Profile</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage your company's core identity and details on the platform.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company Name</label>
                  <div className="mt-1 font-medium text-foreground bg-slate-50 border px-3 py-2 rounded-md">{tenant.name}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tenant ID</label>
                  <div className="mt-1 font-mono text-xs text-foreground bg-slate-50 border px-3 py-2 rounded-md select-all">{tenant.id}</div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registration Date</label>
                  <div className="mt-1 font-medium text-foreground bg-slate-50 border px-3 py-2 rounded-md">{new Date(tenant.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="bg-slate-50/50 border rounded-lg p-5 flex flex-col items-center justify-center text-center">
                <Building2 className="w-12 h-12 text-primary/20 mb-3" />
                <h3 className="font-semibold text-sm">Update Profile</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">Editing organization details is restricted to Tenant Owners.</p>
                <button disabled className="px-4 py-2 bg-primary/10 text-primary rounded-md text-sm font-medium opacity-50 cursor-not-allowed">Edit Restricted</button>
              </div>
            </div>
          </div>
        )}

        {/* 2. PEOPLE & ROLES */}
        {activeTab === 'people' && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-primary tracking-tight">Employees & Access</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage the personnel who have access to your workspace.</p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{users.length} Active</Badge>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Employee</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success" className="text-[10px]">ACTIVE</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground italic">No employees found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center"><Shield className="w-4 h-4 mr-2" /> Custom Roles</h3>
              {roles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map(role => (
                    <div key={role.id} className="border rounded-md p-4 bg-slate-50/30">
                      <h4 className="font-semibold text-sm">{role.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Workspace standard role</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed rounded-md p-6 text-center text-muted-foreground bg-slate-50/50 text-sm">
                  Role management coming soon. Base RBAC policies apply.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary tracking-tight">Security & Authentication</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure workspace perimeter and identity policies.</p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="border rounded-md p-4 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-sm">Two-Factor Authentication</h4>
                    <p className="text-xs text-muted-foreground">Enforce 2FA for all employees.</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[10px] tracking-wider">Coming Soon</Badge>
              </div>

              <div className="border rounded-md p-4 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <User2 className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-sm">Single Sign-On (SSO)</h4>
                    <p className="text-xs text-muted-foreground">SAML/OIDC Provider Configuration.</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase text-[10px] tracking-wider">Coming Soon</Badge>
              </div>
            </div>
          </div>
        )}

        {/* 4. INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary tracking-tight">Connected Services</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage external API integrations and webhooks.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-sm">WhatsApp Business API</div>
                  <Badge variant="outline" className="text-[10px] uppercase">Unconfigured</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Integration available after Meta provider configuration.</p>
                <button disabled className="w-full py-2 bg-muted text-muted-foreground rounded text-xs font-medium opacity-50 cursor-not-allowed">Connect Provider</button>
              </div>

              <div className="border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-sm">Email Gateway (Resend)</div>
                  <Badge variant="outline" className="text-[10px] uppercase">Unconfigured</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Integration available after Domain verification.</p>
                <button disabled className="w-full py-2 bg-muted text-muted-foreground rounded text-xs font-medium opacity-50 cursor-not-allowed">Verify Domain</button>
              </div>

              <div className="border rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-sm">CCTV Telemetry</div>
                  <Badge variant="outline" className="text-[10px] uppercase">Unconfigured</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Connect ONVIF/RTSP compliant camera bridges.</p>
                <button disabled className="w-full py-2 bg-muted text-muted-foreground rounded text-xs font-medium opacity-50 cursor-not-allowed">Add Bridge</button>
              </div>
            </div>
          </div>
        )}

        {/* 5. BILLING */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary tracking-tight">Billing & Plans</h2>
              <p className="text-sm text-muted-foreground mt-1">Manage your active subscriptions and payment methods.</p>
            </div>

            {subscriptions.length > 0 ? (
              <div className="space-y-4 max-w-2xl">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="border border-green-200 bg-green-50/50 rounded-lg p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="success" className="mb-2">ACTIVE SUBSCRIPTION</Badge>
                        <h3 className="font-bold text-lg text-foreground">{sub.plan?.name || 'Enterprise Plan'}</h3>
                        <p className="text-sm text-muted-foreground mt-1">Valid until {new Date(sub.endDate || sub.renewalDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-700">{formatINR(Number(sub.plan?.price || 0))}</div>
                        <div className="text-xs text-green-600/70 font-medium">/{sub.plan?.billingCycle || 'CYCLE'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed rounded-lg p-10 text-center bg-slate-50/50">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <h3 className="text-sm font-semibold">Billing Module Not Configured</h3>
                <p className="text-xs text-muted-foreground mt-1">Active subscriptions will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
