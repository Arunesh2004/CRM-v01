'use client';

import { CameraStreamContainer } from '@/app/(crm)/cameras/[id]/_components/camera-stream-container';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: camera prop type requires typed Prisma result with relations; architectural typing deferred to S3
export function CameraStreamCard({ camera }: { camera: any }) {
  return (
    <div className="glass-panel rounded-xl overflow-hidden flex flex-col group border-l-4 border-l-transparent hover:border-l-emerald-500 transition-all duration-300">
      <div className="aspect-video relative overflow-hidden bg-black">
        <CameraStreamContainer
          cameraId={camera.id}
          status={camera.status}
          authMode={camera.authMode || 'NONE'}
          hasCredentials={camera.hasCredentials || false}
        />
      </div>
      
      {/* Camera Details */}
      <div className="p-4 border-t border-white/[.04] bg-white/[.01] flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-lg group-hover:text-emerald-400 transition-colors">{camera.name}</h3>
          <p className="text-[#8891B0] text-xs font-semibold uppercase tracking-wider mb-2">{camera.location?.name || 'Unassigned Location'}</p>
        </div>
      </div>
    </div>
  );
}
