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
    <div className="flex flex-col md:flex-row gap-8 animate-in fade-in duration-500 min-h-[calc(100vh-10rem)]">
      
      {/* LEFT SETTINGS NAVIGATION */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all border ${
                isActive 
                ? 'bg-violet-500/10 text-violet-400 border-violet-500/30 shadow-[0_0_15px_rgba(124,92,252,0.1)]' 
                : 'bg-transparent text-[#8891B0] border-transparent hover:bg-white/[.02] hover:text-white hover:border-white/[.04]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 glass-panel rounded-xl shadow-2xl p-6 lg:p-8 relative overflow-hidden border border-white/[.08]">
        
        {/* 1. ORGANIZATION */}
        {activeTab === 'organization' && (
          <div className="space-y-8">
            <div className="border-b border-white/[.04] pb-4">
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Organization Profile</h2>
              <p className="text-sm text-[#8891B0] mt-1">Manage your company's core identity and details on the platform.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-[#8891B0] uppercase tracking-widest">Company Name</label>
                  <div className="mt-2 font-medium text-white bg-[#06080F]/50 border border-white/[.08] px-4 py-3 rounded-lg">{tenant.name}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8891B0] uppercase tracking-widest">Tenant ID</label>
                  <div className="mt-2 font-mono text-xs text-[#8891B0] bg-[#06080F]/50 border border-white/[.08] px-4 py-3 rounded-lg select-all">{tenant.id}</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8891B0] uppercase tracking-widest">Registration Date</label>
                  <div className="mt-2 font-medium text-white bg-[#06080F]/50 border border-white/[.08] px-4 py-3 rounded-lg">{new Date(tenant.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="bg-white/[.02] border border-white/[.04] rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <Building2 className="w-16 h-16 text-violet-500/20 mb-4" />
                <h3 className="font-display font-bold text-white mb-2">Update Profile</h3>
                <p className="text-sm text-[#8891B0] mb-6">Editing organization details is restricted to Tenant Owners.</p>
                <button disabled className="px-6 py-2.5 bg-white/5 text-[#8891B0] rounded-lg text-sm font-semibold opacity-50 cursor-not-allowed">Edit Restricted</button>
              </div>
            </div>
          </div>
        )}

        {/* 2. PEOPLE & ROLES */}
        {activeTab === 'people' && (
          <div className="space-y-8">
            <div className="flex justify-between items-start border-b border-white/[.04] pb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-white tracking-tight">Employees & Access</h2>
                <p className="text-sm text-[#8891B0] mt-1">Manage the personnel who have access to your workspace.</p>
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {users.length} Active
              </div>
            </div>

            <div className="border border-white/[.08] rounded-xl overflow-hidden bg-[#06080F]/50">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[.02] border-b border-white/[.08]">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Employee</th>
                    <th className="px-4 py-3 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Status</th>
                    <th className="px-4 py-3 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.04]">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-white/[.02] transition-colors">
                      <td className="px-4 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center font-bold text-xs">
                          {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{user.email}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          ACTIVE
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#8891B0]">{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-12 text-center text-[#8891B0] italic">No employees found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 pt-6 border-t border-white/[.04]">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center tracking-wider uppercase"><Shield className="w-4 h-4 mr-2 text-violet-400" /> Custom Roles</h3>
              {roles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map(role => (
                    <div key={role.id} className="border border-white/[.08] rounded-xl p-5 bg-white/[.02] hover:bg-white/[.04] transition-colors">
                      <h4 className="font-semibold text-white mb-1">{role.name}</h4>
                      <p className="text-xs text-[#8891B0]">Workspace standard role</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-white/[.04] border-dashed rounded-xl p-8 text-center text-[#8891B0] bg-white/[.01] text-sm">
                  Role management coming soon. Base RBAC policies apply.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            <div className="border-b border-white/[.04] pb-4">
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Security & Authentication</h2>
              <p className="text-sm text-[#8891B0] mt-1">Configure workspace perimeter and identity policies.</p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="border border-white/[.08] rounded-xl p-5 flex items-center justify-between bg-white/[.02]">
                <div className="flex items-center gap-4">
                  <div className="bg-violet-500/10 p-2.5 rounded-lg">
                    <Lock className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Two-Factor Authentication</h4>
                    <p className="text-xs text-[#8891B0] mt-1">Enforce 2FA for all employees.</p>
                  </div>
                </div>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Coming Soon</span>
              </div>

              <div className="border border-white/[.08] rounded-xl p-5 flex items-center justify-between bg-white/[.02]">
                <div className="flex items-center gap-4">
                  <div className="bg-cyan-500/10 p-2.5 rounded-lg">
                    <User2 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Single Sign-On (SSO)</h4>
                    <p className="text-xs text-[#8891B0] mt-1">SAML/OIDC Provider Configuration.</p>
                  </div>
                </div>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Coming Soon</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. INTEGRATIONS */}
        {activeTab === 'integrations' && (
          <div className="space-y-8">
            <div className="border-b border-white/[.04] pb-4">
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Connected Services</h2>
              <p className="text-sm text-[#8891B0] mt-1">Manage external API integrations and webhooks.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-white/[.08] bg-white/[.01] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-white">WhatsApp Business API</div>
                  <span className="bg-white/5 text-[#8891B0] border border-white/[.08] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Unconfigured</span>
                </div>
                <p className="text-sm text-[#8891B0] mb-6">Integration available after Meta provider configuration.</p>
                <button disabled className="w-full py-2.5 bg-white/5 border border-white/[.04] text-[#8891B0] rounded-lg text-sm font-semibold opacity-50 cursor-not-allowed transition-colors">Connect Provider</button>
              </div>

              <div className="border border-white/[.08] bg-white/[.01] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-white">Email Gateway (Resend)</div>
                  <span className="bg-white/5 text-[#8891B0] border border-white/[.08] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Unconfigured</span>
                </div>
                <p className="text-sm text-[#8891B0] mb-6">Integration available after Domain verification.</p>
                <button disabled className="w-full py-2.5 bg-white/5 border border-white/[.04] text-[#8891B0] rounded-lg text-sm font-semibold opacity-50 cursor-not-allowed transition-colors">Verify Domain</button>
              </div>

              <div className="border border-white/[.08] bg-white/[.01] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-white">CCTV Telemetry</div>
                  <span className="bg-white/5 text-[#8891B0] border border-white/[.08] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Unconfigured</span>
                </div>
                <p className="text-sm text-[#8891B0] mb-6">Connect ONVIF/RTSP compliant camera bridges.</p>
                <button disabled className="w-full py-2.5 bg-white/5 border border-white/[.04] text-[#8891B0] rounded-lg text-sm font-semibold opacity-50 cursor-not-allowed transition-colors">Add Bridge</button>
              </div>
            </div>
          </div>
        )}

        {/* 5. BILLING */}
        {activeTab === 'billing' && (
          <div className="space-y-8">
            <div className="border-b border-white/[.04] pb-4">
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Billing & Plans</h2>
              <p className="text-sm text-[#8891B0] mt-1">Manage your active subscriptions and payment methods.</p>
            </div>

            {subscriptions.length > 0 ? (
              <div className="space-y-4 max-w-2xl">
                {subscriptions.map(sub => (
                  <div key={sub.id} className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-3 inline-block">ACTIVE SUBSCRIPTION</span>
                        <h3 className="font-display font-bold text-xl text-white">{sub.plan?.name || 'Enterprise Plan'}</h3>
                        <p className="text-sm text-[#8891B0] mt-1">Valid until {new Date(sub.endDate || sub.renewalDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-display font-bold text-emerald-400">{formatINR(Number(sub.plan?.price || 0))}</div>
                        <div className="text-xs text-emerald-500/70 font-bold uppercase tracking-widest mt-1">/{sub.plan?.billingCycle || 'CYCLE'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-white/[.04] border-dashed rounded-xl p-12 text-center bg-white/[.01]">
                <CreditCard className="w-16 h-16 mx-auto text-white/10 mb-4" />
                <h3 className="text-lg font-bold text-white">Billing Module Not Configured</h3>
                <p className="text-sm text-[#8891B0] mt-2">Active subscriptions will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
