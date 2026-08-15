import { Suspense } from 'react';
import { getAllNotificationsAction } from '@/modules/communication/actions/notification.actions';
import { getCallHistoryAction } from '@/modules/communication/actions/call.actions';
import { MessageSquare, Phone, Bell, Search, History, HelpCircle, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function CommunicationsPage() {
  const [notificationsRes, callsRes] = await Promise.all([
    getAllNotificationsAction(),
    getCallHistoryAction()
  ]);

  const notifications = notificationsRes.success ? (notificationsRes.data || []) : [];
  const calls = callsRes.success ? (callsRes.data || []) : [];

  // Sort combined history chronological descending
  const history = [
    ...notifications.map((n: any) => ({ ...n, _type: 'notification', _date: new Date(n.createdAt) })),
    ...calls.map((c: any) => ({ ...c, _type: 'call', _date: new Date(c.createdAt) }))
  ].sort((a, b) => b._date.getTime() - a._date.getTime());

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* LEFT PANEL: Conversation Directory */}
      <div className="glass-panel md:w-80 flex flex-col shrink-0 h-full overflow-hidden">
        <div className="border-b border-white/[.04] px-4 py-3 bg-[#0D1326]/30">
          <h3 className="text-sm font-semibold text-[#8891B0] uppercase tracking-wider flex items-center">
            <MessageSquare className="w-4 h-4 mr-2 text-violet-400" />
            Active Conversations
          </h3>
        </div>
        <div className="flex-1 p-0 flex flex-col items-center justify-center text-center">
          <div className="px-6 py-10">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[#8891B0] opacity-50" />
            <h3 className="text-sm font-medium text-white mb-1">No Active Threads</h3>
            <p className="text-xs text-[#8891B0] leading-relaxed">
              WhatsApp and Email integrations are coming soon.
            </p>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: Conversation Timeline */}
      <div className="glass-panel flex-1 flex flex-col h-full overflow-hidden">
        <div className="border-b border-white/[.04] px-6 py-4 bg-[#0D1326]/30 z-10 flex flex-row items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-white">Activity Timeline</h2>
            <p className="text-xs text-[#8891B0] mt-0.5">Comprehensive log of notifications and calls</p>
          </div>
          <div className="flex items-center text-xs font-medium text-violet-400 bg-violet-500/10 px-2.5 py-1.5 rounded-lg border border-violet-500/20">
            <History className="w-3.5 h-3.5 mr-1.5" />
            {history.length} records
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-transparent">
          <Suspense fallback={<div className="p-4 text-center text-sm text-[#8891B0] animate-pulse">Loading history...</div>}>
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <History className="w-12 h-12 text-[#8891B0] opacity-30 mb-4" />
                <h3 className="text-lg font-display font-semibold text-white mb-2">Timeline is Empty</h3>
                <p className="text-sm text-[#8891B0] max-w-sm">System notifications and call records will appear here chronologically.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item: any) => (
                  <div key={item.id} className="flex gap-4 group">
                    
                    {/* Timeline Line & Icon */}
                    <div className="flex flex-col items-center shrink-0 mt-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0 z-10 border
                        ${item._type === 'call' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {item._type === 'call' ? (
                          item.direction === 'INBOUND' ? <PhoneIncoming className="w-4 h-4" /> : <PhoneOutgoing className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>
                      <div className="w-px h-full bg-white/[.08] mt-2 group-last:hidden" />
                    </div>

                    {/* Timeline Content */}
                    <div className="flex-1 bg-[#0D1326]/40 border border-white/[.04] rounded-xl p-4 group-hover:border-violet-500/30 transition-colors pb-4 mb-4">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div className="font-semibold text-sm text-white">
                          {item._type === 'call' ? (
                            <span>{item.direction === 'INBOUND' ? 'Inbound Call' : 'Outbound Call'}</span>
                          ) : (
                            <span>{item.title}</span>
                          )}
                        </div>
                        <div className="text-[10px] font-medium text-[#8891B0] flex items-center whitespace-nowrap bg-white/[.02] border border-white/[.04] px-2 py-1 rounded-md">
                          <Clock className="w-3 h-3 mr-1.5 opacity-70" />
                          {item._date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                      </div>
                      
                      <div className="text-sm text-[#8891B0] leading-relaxed">
                        {item._type === 'call' ? (
                          <div className="flex flex-wrap gap-3 items-center text-xs mt-1">
                            <Badge variant={item.status === 'COMPLETED' ? 'emerald' : item.status === 'MISSED' ? 'rose' : 'slate'} className="text-[10px] px-2 py-0.5 h-auto">
                              {item.status}
                            </Badge>
                            {item.durationSeconds && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 opacity-50"/> {item.durationSeconds}s</span>}
                          </div>
                        ) : (
                          <p className="text-[#E7EAF5]">{item.message}</p>
                        )}
                      </div>
                    </div>
                    
                  </div>
                ))}
              </div>
            )}
          </Suspense>
        </div>
      </div>

      {/* RIGHT PANEL: Context Workspace */}
      <div className="glass-panel md:w-72 flex flex-col shrink-0 h-full overflow-hidden hidden lg:flex">
        <div className="border-b border-white/[.04] px-4 py-3 bg-[#0D1326]/30">
          <h3 className="text-sm font-semibold text-[#8891B0] uppercase tracking-wider flex items-center">
            <Search className="w-4 h-4 mr-2 text-cyan-400" />
            Context Profile
          </h3>
        </div>
        <div className="flex-1 p-0 flex flex-col items-center justify-center text-center">
          <div className="px-6 py-10">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 text-[#8891B0] opacity-50" />
            <h3 className="text-sm font-medium text-white mb-1">Select a Thread</h3>
            <p className="text-xs text-[#8891B0] leading-relaxed">
              Customer intelligence and related records will appear here once an active communication thread is selected.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
