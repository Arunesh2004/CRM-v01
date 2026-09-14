'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { Users, Target } from 'lucide-react';
import Link from 'next/link';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

export function CrmMetricsCard({ crm }: { crm: any }) {
  const crmData = [
    { name: 'Leads', value: crm.leads },
    { name: 'Customers', value: crm.customers },
    { name: 'Tasks', value: crm.tasks }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/customers" className="block">
          <Card className="group relative overflow-hidden hover:ring-2 hover:ring-cyan-500/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-4 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-semibold text-[#8891B0] uppercase tracking-wider">Total Customers</p>
                <h3 className="text-2xl font-display font-bold text-white mt-1">{crm.customers}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/leads" className="block">
          <Card className="group relative overflow-hidden hover:ring-2 hover:ring-amber-500/50 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardContent className="p-4 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-semibold text-[#8891B0] uppercase tracking-wider">Lead Pipeline</p>
                <h3 className="text-2xl font-display font-bold text-white mt-1">{crm.leads}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Target className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

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
    </div>
  );
}
