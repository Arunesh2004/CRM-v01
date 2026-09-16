import CallDirectory from '@/components/communication/CallDirectory';
import { requireAuth } from '@/lib/auth';
import { Phone } from 'lucide-react';

export default async function CommunicationCallsPage() {
  const user = await requireAuth();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 px-6 mt-6">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0D1326] border border-white/10">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Phone className="w-5 h-5 text-indigo-400" /> Internal Calling
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Native WebRTC direct internal calling with real-time presence.</p>
        </div>
      </div>

      <CallDirectory userId={user.id} tenantId={user.tenantId} />
    </div>
  );
}
