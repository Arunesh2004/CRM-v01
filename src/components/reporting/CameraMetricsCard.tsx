'use client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Video } from 'lucide-react';
import Link from 'next/link';

export function CameraMetricsCard({ camera }: { camera: any }) {
  return (
    <div className="space-y-6">
      <Link href="/infrastructure/cctv" className="block">
        <Card className="group relative overflow-hidden hover:ring-2 hover:ring-emerald-500/50 transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-4 flex items-center justify-between relative z-10">
            <div>
              <p className="text-[10px] font-semibold text-[#8891B0] uppercase tracking-wider">CCTV Health</p>
              <h3 className="text-2xl font-display font-bold text-white mt-1">{camera.total > 0 ? Math.round((camera.active / camera.total) * 100) : 0}%</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Video className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </Link>

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
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/[.08] flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-display font-bold text-white">{camera.total}</span>
              </div>
              <p className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Total Cameras</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-display font-bold text-emerald-400">{camera.active}</span>
              </div>
              <p className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Online</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-display font-bold text-rose-400">{camera.offline}</span>
              </div>
              <p className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Offline</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
