'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Cell as PieCell, Legend, CartesianGrid } from 'recharts';
import { Users, Target, CheckSquare, ShieldAlert, Video, IndianRupee, Shield, ShieldCheck, Mail, MessageSquare, Phone } from 'lucide-react';

const COLORS = {
  primary: '#0f172a',
  secondary: '#334155',
  accent: '#f59e0b',
  success: '#10b981',
  destructive: '#ef4444',
  muted: '#cbd5e1'
};

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];
const SEVERITY_COLORS = ['#3b82f6', '#eab308', '#f97316', '#ef4444'];

export function DashboardClientView({ metrics }: { metrics: any }) {
  const { security, camera, crm, communication, billing } = metrics;

  // Format currency
  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  };

  // Prepare chart data
  const crmData = [
    { name: 'Leads', value: crm.leads },
    { name: 'Customers', value: crm.customers },
    { name: 'Tasks', value: crm.tasks }
  ];

  const securityStatusData = [
    { name: 'Open', value: security.open },
    { name: 'Investigating', value: security.investigating },
    { name: 'Resolved', value: security.resolved }
  ].filter(d => d.value > 0);

  const securitySeverityData = [
    { name: 'Critical', value: security.critical },
    { name: 'Non-Critical', value: security.total - security.critical }
  ].filter(d => d.value > 0);

  const commData = [
    { name: 'Emails', value: communication.email },
    { name: 'SMS', value: communication.sms },
    { name: 'WhatsApp', value: communication.whatsapp },
    { name: 'Calls', value: communication.calls }
  ].filter(d => d.value > 0);

  const cameraData = [
    { name: 'Online', value: camera.active },
    { name: 'Offline', value: camera.offline }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* EXECUTIVE SUMMARY KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary text-primary-foreground border-primary shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider">Total ARR</p>
              <h3 className="text-2xl font-bold mt-1">{formatINR(billing.arr)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Customers</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{crm.customers}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead Pipeline</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{crm.leads}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Target className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Alerts</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{security.open + security.investigating}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CCTV Health</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{camera.total > 0 ? Math.round((camera.active / camera.total) * 100) : 0}%</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
              <Video className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SECTION 1: CRM PERFORMANCE */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-sm font-bold flex items-center">
              <Users className="w-4 h-4 mr-2 text-primary" />
              CRM Operations Volume
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[250px] w-full">
              {(crm.leads + crm.customers + crm.tasks) === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">No CRM data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={crmData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      {crmData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Conversion Rate</p>
                <p className="font-bold text-lg text-primary">{crm.conversionRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Pipeline</p>
                <p className="font-bold text-lg text-primary">{crm.leads}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Active Accounts</p>
                <p className="font-bold text-lg text-primary">{crm.customers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: SECURITY OPERATIONS */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-sm font-bold flex items-center">
              <Shield className="w-4 h-4 mr-2 text-primary" />
              Security Operations Center (SOC)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row h-[250px] gap-4">
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-center text-muted-foreground mb-2">Incident Status</h4>
                {securityStatusData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs italic">No incidents recorded.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={securityStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                        {securityStatusData.map((entry, index) => (
                          <PieCell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-center text-muted-foreground mb-2">Criticality Distribution</h4>
                {securitySeverityData.length === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs italic">No incidents recorded.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={securitySeverityData} cx="50%" cy="50%" innerRadius={0} outerRadius={70} dataKey="value">
                        {securitySeverityData.map((entry, index) => (
                          <PieCell key={`cell-${index}`} fill={entry.name === 'Critical' ? '#ef4444' : '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-4 border-t px-4">
              <div className="flex items-center text-sm">
                <ShieldCheck className="w-4 h-4 mr-2 text-success" />
                <span className="text-muted-foreground">Resolved Threats</span>
              </div>
              <span className="font-bold text-lg text-foreground">{security.resolved}</span>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: COMMUNICATION VOLUME */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-sm font-bold flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-primary" />
              Omnichannel Communication
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[250px] w-full">
              {commData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">No communications logged.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={80} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                      {commData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t px-4">
              <div className="text-sm text-muted-foreground">Delivery Success Rate</div>
              <div className="font-bold text-lg text-primary">{communication.successRate}%</div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: INFRASTRUCTURE (CCTV & BILLING) */}
        <div className="space-y-6 flex flex-col">
          <Card className="shadow-sm flex-1">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-sm font-bold flex items-center">
                <Video className="w-4 h-4 mr-2 text-primary" />
                Surveillance Infrastructure
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col justify-center items-center">
              <div className="flex gap-8 w-full justify-around mt-4">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-slate-700">{camera.total}</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cameras</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-green-600">{camera.active}</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Online</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-red-600">{camera.offline}</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Offline</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm flex-1">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle className="text-sm font-bold flex items-center">
                <IndianRupee className="w-4 h-4 mr-2 text-primary" />
                Revenue Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Monthly Recurring</p>
                  <p className="text-2xl font-bold text-foreground">{formatINR(billing.mrr)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Annual Run Rate</p>
                  <p className="text-2xl font-bold text-accent">{formatINR(billing.arr)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Subscriptions</p>
                  <p className="text-lg font-bold text-foreground">{billing.subscriptions}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Processed Invoices</p>
                  <p className="text-lg font-bold text-foreground">{billing.invoices}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
