import { Suspense } from 'react';
import { getAllNotificationsAction } from '@/modules/communication/actions/notification.actions';
import { getCallHistoryAction } from '@/modules/communication/actions/call.actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { MessageSquare, Phone, Bell, Search, History, HelpCircle, PhoneIncoming, PhoneOutgoing, Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
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
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4 animate-in fade-in duration-500">
      
      {/* LEFT PANEL: Conversation Directory */}
      <Card className="md:w-80 flex flex-col shrink-0 h-full overflow-hidden border-r bg-card/50">
        <CardHeader className="border-b px-4 py-3 bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center">
            <MessageSquare className="w-4 h-4 mr-2 text-primary" />
            Active Conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col items-center justify-center text-center">
          <div className="px-6 py-10 opacity-70">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-sm font-medium mb-1">No Active Threads</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              WhatsApp and Email integrations are coming soon.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CENTER PANEL: Conversation Timeline */}
      <Card className="flex-1 flex flex-col h-full overflow-hidden shadow-sm">
        <CardHeader className="border-b px-4 py-3 bg-card shadow-sm z-10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-primary">Activity Timeline</CardTitle>
            <p className="text-xs text-muted-foreground">Comprehensive log of notifications and calls</p>
          </div>
          <div className="flex items-center text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded">
            <History className="w-3.5 h-3.5 mr-1" />
            {history.length} records
          </div>
        </CardHeader>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
          <Suspense fallback={<div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Loading history...</div>}>
            {history.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState 
                  title="Timeline is Empty" 
                  description="System notifications and call records will appear here chronologically."
                  icon={<History className="w-12 h-12 opacity-40" />}
                  className="border-none bg-transparent"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item: any) => (
                  <div key={item.id} className="flex gap-3 group">
                    
                    {/* Timeline Line & Icon */}
                    <div className="flex flex-col items-center shrink-0 mt-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0 z-10 
                        ${item._type === 'call' ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'}`}>
                        {item._type === 'call' ? (
                          item.direction === 'INBOUND' ? <PhoneIncoming className="w-4 h-4" /> : <PhoneOutgoing className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>
                      <div className="w-px h-full bg-border -mt-2 group-last:hidden" />
                    </div>

                    {/* Timeline Content */}
                    <div className="flex-1 bg-white border rounded-lg p-3 shadow-sm group-hover:border-accent transition-colors pb-4 mb-2">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div className="font-semibold text-sm text-foreground">
                          {item._type === 'call' ? (
                            <span>{item.direction === 'INBOUND' ? 'Inbound Call' : 'Outbound Call'}</span>
                          ) : (
                            <span>{item.title}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center whitespace-nowrap bg-muted/30 px-1.5 py-0.5 rounded">
                          <Clock className="w-3 h-3 mr-1" />
                          {item._date.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        {item._type === 'call' ? (
                          <div className="flex flex-wrap gap-2 items-center text-xs">
                            <Badge variant={item.status === 'COMPLETED' ? 'success' : item.status === 'MISSED' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {item.status}
                            </Badge>
                            {item.durationSeconds && <span>Duration: {item.durationSeconds}s</span>}
                          </div>
                        ) : (
                          <p>{item.message}</p>
                        )}
                      </div>
                    </div>
                    
                  </div>
                ))}
              </div>
            )}
          </Suspense>
        </div>
      </Card>

      {/* RIGHT PANEL: Context Workspace */}
      <Card className="md:w-72 flex flex-col shrink-0 h-full overflow-hidden border-l bg-card/50 hidden lg:flex">
        <CardHeader className="border-b px-4 py-3 bg-muted/20">
          <CardTitle className="text-sm font-semibold flex items-center">
            <Search className="w-4 h-4 mr-2 text-primary" />
            Context Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col items-center justify-center text-center">
          <div className="px-6 py-10 opacity-70">
            <HelpCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
            <h3 className="text-sm font-medium mb-1">Select a Thread</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Customer intelligence and related records will appear here once an active communication thread is selected.
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
