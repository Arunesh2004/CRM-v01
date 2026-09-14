'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ResponsiveContainer, PieChart, Pie, Cell as PieCell, Tooltip } from 'recharts';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'];

export function SecurityMetricsCard({ security }: { security: any }) {
  const securityStatusData = [
    { name: 'Open', value: security.open },
    { name: 'Investigating', value: security.investigating },
    { name: 'Resolved', value: security.resolved }
  ].filter(d => d.value > 0);

  const securitySeverityData = [
    { name: 'Critical', value: security.critical },
    { name: 'Non-Critical', value: security.total - security.critical }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <Link href="/incidents?status=OPEN" className="block">
        <Card className="group relative overflow-hidden hover:ring-2 hover:ring-rose-500/50 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-4 flex items-center justify-between relative z-10">
            <div>
              <p className="text-[10px] font-semibold text-[#8891B0] uppercase tracking-wider">Active Alerts</p>
              <h3 className="text-2xl font-display font-bold text-white mt-1">{security.open + security.investigating}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </Link>

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
    </div>
  );
}
