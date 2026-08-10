'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateIncidentStatusAction, resolveIncidentAction, deleteIncidentAction } from '@/modules/incident/actions/incident.actions';
import { IncidentNotificationStatus } from './IncidentNotificationStatus';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle, ShieldAlert, CheckCircle, Video, MapPin, Clock, Search, Shield, ChevronRight, User2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function IncidentClientTable({ incidents }: { incidents: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(incidents[0]?.id || null);

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  const handleResolve = async (id: string) => {
    setLoadingId(id);
    await resolveIncidentAction(id);
    setLoadingId(null);
    router.refresh();
  };

  const handleInvestigate = async (id: string) => {
    setLoadingId(id);
    await updateIncidentStatusAction({ id, status: 'INVESTIGATING' });
    setLoadingId(null);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this incident?')) return;
    setLoadingId(id);
    await deleteIncidentAction(id);
    setLoadingId(null);
    if (selectedIncidentId === id) setSelectedIncidentId(null);
    router.refresh();
  };

  // Metrics
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter(i => i.status === 'OPEN' || i.status === 'INVESTIGATING').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL' && (i.status === 'OPEN' || i.status === 'INVESTIGATING')).length;
  const uniqueLocations = new Set(incidents.map(i => i.location?.id).filter(Boolean)).size;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'border-red-500 bg-red-500/10 text-red-600';
      case 'HIGH': return 'border-orange-500 bg-orange-500/10 text-orange-600';
      case 'MEDIUM': return 'border-yellow-500 bg-yellow-500/10 text-yellow-600';
      case 'LOW': return 'border-blue-500 bg-blue-500/10 text-blue-600';
      default: return 'border-gray-500 bg-gray-500/10 text-gray-600';
    }
  };

  if (incidents.length === 0) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <EmptyState 
          title="Security Perimeter Secure" 
          description="No incidents have been detected by the surveillance systems or manually reported."
          icon={<Shield className="w-16 h-16 opacity-30 text-success" />}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 gap-4">
      
      {/* TOP COMMAND BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <Card className="bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Alerts</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalIncidents}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{openIncidents}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Critical Threat</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{criticalIncidents}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Impacted Sites</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{uniqueLocations}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <MapPin className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* THREE PANE LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        
        {/* LEFT PANEL: Queue */}
        <Card className="lg:w-80 flex flex-col shrink-0 h-full overflow-hidden bg-card/50 shadow-sm border">
          <CardHeader className="border-b px-4 py-3 bg-muted/30">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center"><ShieldAlert className="w-4 h-4 mr-2 text-primary" /> Incident Queue</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col divide-y">
              {incidents.map((incident) => {
                const isSelected = selectedIncidentId === incident.id;
                return (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncidentId(incident.id)}
                    className={`w-full text-left p-4 hover:bg-muted/50 transition-colors border-l-4 ${isSelected ? 'bg-muted border-l-primary' : 'border-l-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className={`text-xs font-bold px-1.5 py-0.5 rounded border ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="font-semibold text-sm text-foreground truncate mt-2">{incident.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center truncate">
                      <MapPin className="w-3 h-3 mr-1 shrink-0" />
                      {incident.location?.name || 'Unknown Site'}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* CENTER PANEL: Investigation Workspace */}
        <Card className="flex-1 flex flex-col h-full overflow-hidden shadow-sm border">
          {!selectedIncident ? (
            <div className="h-full flex items-center justify-center bg-slate-50/50">
              <EmptyState 
                title="No Selection" 
                description="Select an incident from the queue to begin investigation."
                icon={<Search className="w-12 h-12 opacity-30" />}
                className="border-none bg-transparent"
              />
            </div>
          ) : (
            <>
              <CardHeader className="border-b px-6 py-4 bg-card shadow-sm z-10 flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={selectedIncident.status === 'RESOLVED' || selectedIncident.status === 'CLOSED' ? 'success' : 'destructive'} className="uppercase">
                      {selectedIncident.status}
                    </Badge>
                    <div className={`text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${getSeverityColor(selectedIncident.severity)}`}>
                      {selectedIncident.severity}
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-primary mt-1">{selectedIncident.title}</CardTitle>
                </div>
                
                <div className="flex gap-2">
                  {selectedIncident.status === 'OPEN' && (
                    <button 
                      onClick={() => handleInvestigate(selectedIncident.id)}
                      disabled={loadingId === selectedIncident.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingId === selectedIncident.id ? 'Working...' : 'Start Investigation'}
                    </button>
                  )}
                  {(selectedIncident.status === 'OPEN' || selectedIncident.status === 'INVESTIGATING') && (
                    <button 
                      onClick={() => handleResolve(selectedIncident.id)}
                      disabled={loadingId === selectedIncident.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingId === selectedIncident.id ? 'Working...' : 'Resolve Incident'}
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(selectedIncident.id)}
                    disabled={loadingId === selectedIncident.id}
                    className="bg-muted hover:bg-red-100 hover:text-red-600 text-muted-foreground px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </CardHeader>
              
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                <div className="max-w-3xl space-y-8">
                  
                  {/* Description */}
                  <section>
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 opacity-50" />
                      Incident Details
                    </h3>
                    <div className="bg-white border rounded-lg p-5 shadow-sm text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedIncident.description || <span className="italic text-muted-foreground">No description provided for this incident.</span>}
                    </div>
                  </section>

                  {/* Timeline */}
                  <section>
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2 opacity-50" />
                      Event Timeline
                    </h3>
                    <div className="space-y-4 pl-2">
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-red-500 mt-1"></div>
                          <div className="w-0.5 h-full bg-border my-1"></div>
                        </div>
                        <div className="pb-4">
                          <div className="text-sm font-semibold">Incident Created</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{new Date(selectedIncident.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      
                      {selectedIncident.resolvedAt && (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-green-500 mt-1"></div>
                          </div>
                          <div className="pb-2">
                            <div className="text-sm font-semibold">Incident Resolved</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{new Date(selectedIncident.resolvedAt).toLocaleString()}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                  
                </div>
              </div>
            </>
          )}
        </Card>

        {/* RIGHT PANEL: Context */}
        <Card className="lg:w-72 flex flex-col shrink-0 h-full overflow-y-auto bg-card shadow-sm border hidden xl:flex">
          <CardHeader className="border-b px-4 py-3 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center">
              <Shield className="w-4 h-4 mr-2 text-primary" />
              Security Context
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-6">
            
            {selectedIncident ? (
              <>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Location Data</h4>
                  {selectedIncident.location ? (
                    <div className="bg-muted/40 rounded p-3 border">
                      <div className="font-medium text-sm text-foreground flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-primary" />
                        {selectedIncident.location.name}
                      </div>
                      {(selectedIncident.location.address || selectedIncident.location.city) && (
                        <div className="text-xs text-muted-foreground mt-1 ml-5">
                          {selectedIncident.location.address} {selectedIncident.location.city}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic border border-dashed rounded p-3 bg-muted/10">Unknown Location</div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
                    Camera Feed
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-blue-50 text-blue-700 border-blue-200">Ready</Badge>
                  </h4>
                  {selectedIncident.camera ? (
                    <div className="rounded border bg-black aspect-video flex flex-col items-center justify-center text-center p-4 relative overflow-hidden group">
                      <Video className="w-8 h-8 text-white/30 mb-2" />
                      <div className="text-xs text-white/70 font-medium z-10">{selectedIncident.camera.name}</div>
                      <div className="text-[9px] text-white/40 mt-1 z-10">Live integration available after CCTV provider connection</div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic border border-dashed rounded p-3 bg-muted/10 text-center">
                      <Video className="w-5 h-5 mx-auto mb-1 opacity-20" />
                      No Camera Linked
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assigned Investigator</h4>
                  {selectedIncident.assignedUser ? (
                    <div className="flex items-center gap-2 border rounded p-2 bg-card">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {selectedIncident.assignedUser.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-sm font-medium text-foreground truncate" title={selectedIncident.assignedUser.email}>
                        {selectedIncident.assignedUser.email}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 border border-dashed rounded p-2 bg-muted/10 text-muted-foreground">
                      <User2 className="w-8 h-8 p-1.5 rounded-full bg-muted opacity-50" />
                      <div className="text-xs italic">Unassigned</div>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notification Status</h4>
                  <div className="border rounded p-3">
                    <IncidentNotificationStatus incidentId={selectedIncident.id} />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 opacity-50">
                <Search className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">Context will appear here</p>
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
