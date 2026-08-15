'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateIncidentStatusAction, resolveIncidentAction, deleteIncidentAction } from '@/modules/incident/actions/incident.actions';
import { IncidentNotificationStatus } from './IncidentNotificationStatus';
import { Badge } from '@/components/ui/Badge';
import { AlertCircle, ShieldAlert, CheckCircle, Video, MapPin, Clock, Search, Shield, ChevronRight, User2 } from 'lucide-react';

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
      case 'CRITICAL': return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
      case 'HIGH': return 'border-orange-500/30 bg-orange-500/10 text-orange-400';
      case 'MEDIUM': return 'border-amber-500/30 bg-amber-500/10 text-amber-400';
      case 'LOW': return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
      default: return 'border-white/[.08] bg-white/[.02] text-[#8891B0]';
    }
  };

  if (incidents.length === 0) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-center p-8">
          <Shield className="w-16 h-16 opacity-30 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-display font-semibold text-white mb-2">Security Perimeter Secure</h3>
          <p className="text-sm text-[#8891B0]">No incidents have been detected by the surveillance systems or manually reported.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 gap-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* TOP COMMAND BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
        <div className="glass-panel p-4 flex items-center justify-between group">
          <div>
            <p className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Total Alerts</p>
            <h3 className="text-2xl font-display font-bold text-white mt-1 group-hover:text-violet-400 transition-colors">{totalIncidents}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center justify-between group">
          <div>
            <p className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Active</p>
            <h3 className="text-2xl font-display font-bold text-white mt-1 group-hover:text-amber-400 transition-colors">{openIncidents}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center justify-between border-l-4 border-l-rose-500 group">
          <div>
            <p className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Critical Threat</p>
            <h3 className="text-2xl font-display font-bold text-white mt-1 group-hover:text-rose-400 transition-colors">{criticalIncidents}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center justify-between group">
          <div>
            <p className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Impacted Sites</p>
            <h3 className="text-2xl font-display font-bold text-white mt-1 group-hover:text-cyan-400 transition-colors">{uniqueLocations}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <MapPin className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* THREE PANE LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
        
        {/* LEFT PANEL: Queue */}
        <div className="glass-panel lg:w-80 flex flex-col shrink-0 h-full overflow-hidden">
          <div className="border-b border-white/[.04] px-4 py-3 bg-[#0D1326]/30">
            <h3 className="text-sm font-semibold text-[#8891B0] uppercase tracking-wider flex items-center">
              <ShieldAlert className="w-4 h-4 mr-2 text-violet-400" /> Incident Queue
            </h3>
          </div>
          <div className="flex-1 p-0 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col divide-y divide-white/[.04]">
              {incidents.map((incident) => {
                const isSelected = selectedIncidentId === incident.id;
                return (
                  <button
                    key={incident.id}
                    onClick={() => setSelectedIncidentId(incident.id)}
                    className={`w-full text-left p-4 hover:bg-white/[.02] transition-colors border-l-4 ${isSelected ? 'bg-white/[.04] border-l-violet-500' : 'border-l-transparent'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </div>
                      <div className="text-[10px] text-[#8891B0] font-medium">
                        {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="font-semibold text-sm text-white truncate">{incident.title}</div>
                    <div className="text-xs text-[#8891B0] mt-1.5 flex items-center truncate">
                      <MapPin className="w-3.5 h-3.5 mr-1 shrink-0 opacity-70" />
                      {incident.location?.name || 'Unknown Site'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Investigation Workspace */}
        <div className="glass-panel flex-1 flex flex-col h-full overflow-hidden">
          {!selectedIncident ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-8">
                <Search className="w-12 h-12 opacity-30 text-[#8891B0] mx-auto mb-4" />
                <h3 className="text-lg font-display font-semibold text-white mb-2">No Selection</h3>
                <p className="text-sm text-[#8891B0]">Select an incident from the queue to begin investigation.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-white/[.04] px-6 py-5 bg-[#0D1326]/30 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={selectedIncident.status === 'RESOLVED' || selectedIncident.status === 'CLOSED' ? 'emerald' : 'slate'} className="uppercase h-auto py-0.5 px-2">
                      {selectedIncident.status}
                    </Badge>
                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getSeverityColor(selectedIncident.severity)}`}>
                      {selectedIncident.severity}
                    </div>
                  </div>
                  <h2 className="text-xl font-display font-bold text-white mt-1">{selectedIncident.title}</h2>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  {selectedIncident.status === 'OPEN' && (
                    <button 
                      onClick={() => handleInvestigate(selectedIncident.id)}
                      disabled={loadingId === selectedIncident.id}
                      className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingId === selectedIncident.id ? 'Working...' : 'Start Investigation'}
                    </button>
                  )}
                  {(selectedIncident.status === 'OPEN' || selectedIncident.status === 'INVESTIGATING') && (
                    <button 
                      onClick={() => handleResolve(selectedIncident.id)}
                      disabled={loadingId === selectedIncident.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {loadingId === selectedIncident.id ? 'Working...' : 'Resolve Incident'}
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(selectedIncident.id)}
                    disabled={loadingId === selectedIncident.id}
                    className="bg-white/5 hover:bg-rose-500/20 text-[#8891B0] hover:text-rose-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-3xl space-y-8">
                  
                  {/* Description */}
                  <section>
                    <h3 className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-3 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-amber-400" />
                      Incident Details
                    </h3>
                    <div className="bg-[#0D1326]/40 border border-white/[.04] rounded-xl p-5 text-sm text-white leading-relaxed whitespace-pre-wrap">
                      {selectedIncident.description || <span className="italic text-[#8891B0]">No description provided for this incident.</span>}
                    </div>
                  </section>

                  {/* Timeline */}
                  <section>
                    <h3 className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-3 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-cyan-400" />
                      Event Timeline
                    </h3>
                    <div className="space-y-4 pl-2">
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-rose-500 mt-1 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                          <div className="w-px h-full bg-white/[.08] my-1"></div>
                        </div>
                        <div className="pb-4">
                          <div className="text-sm font-medium text-white">Incident Created</div>
                          <div className="text-xs text-[#8891B0] mt-1">{new Date(selectedIncident.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      
                      {selectedIncident.resolvedAt && (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                          </div>
                          <div className="pb-2">
                            <div className="text-sm font-medium text-white">Incident Resolved</div>
                            <div className="text-xs text-[#8891B0] mt-1">{new Date(selectedIncident.resolvedAt).toLocaleString()}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                  
                </div>
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL: Context */}
        <div className="glass-panel lg:w-72 flex flex-col shrink-0 h-full overflow-y-auto custom-scrollbar hidden xl:flex">
          <div className="border-b border-white/[.04] px-4 py-3 bg-[#0D1326]/30">
            <h3 className="text-sm font-semibold text-[#8891B0] uppercase tracking-wider flex items-center">
              <Shield className="w-4 h-4 mr-2 text-violet-400" />
              Security Context
            </h3>
          </div>
          <div className="p-4 space-y-6">
            
            {selectedIncident ? (
              <>
                <div>
                  <h4 className="text-[10px] font-semibold text-[#8891B0] uppercase tracking-wider mb-2">Location Data</h4>
                  {selectedIncident.location ? (
                    <div className="bg-[#0D1326]/30 rounded-xl p-3 border border-white/[.04]">
                      <div className="font-medium text-sm text-white flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-2 text-cyan-400" />
                        {selectedIncident.location.name}
                      </div>
                      {(selectedIncident.location.address || selectedIncident.location.city) && (
                        <div className="text-xs text-[#8891B0] mt-1.5 ml-5.5">
                          {selectedIncident.location.address} {selectedIncident.location.city}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-[#8891B0] italic border border-white/[.04] border-dashed rounded-xl p-3 bg-white/[.02]">Unknown Location</div>
                  )}
                </div>

                <div>
                  <h4 className="text-[10px] font-semibold text-[#8891B0] uppercase tracking-wider mb-2 flex items-center justify-between">
                    Camera Feed
                    <Badge variant="slate" className="text-[9px] uppercase tracking-widest bg-violet-500/10 text-violet-400 border-violet-500/20 h-auto py-0.5 px-1.5">Ready</Badge>
                  </h4>
                  {selectedIncident.camera ? (
                    <div className="rounded-xl border border-white/[.04] bg-[#070B18] aspect-video flex flex-col items-center justify-center text-center p-4 relative overflow-hidden group shadow-inner">
                      <Video className="w-8 h-8 text-white/20 mb-2 group-hover:text-violet-400/50 transition-colors" />
                      <div className="text-xs text-white/70 font-medium z-10">{selectedIncident.camera.name}</div>
                      <div className="text-[9px] text-white/40 mt-1 z-10">Live integration available after CCTV provider connection</div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                    </div>
                  ) : (
                    <div className="text-xs text-[#8891B0] italic border border-white/[.04] border-dashed rounded-xl p-4 bg-white/[.02] text-center">
                      <Video className="w-5 h-5 mx-auto mb-1.5 opacity-30" />
                      No Camera Linked
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-[10px] font-semibold text-[#8891B0] uppercase tracking-wider mb-2">Assigned Investigator</h4>
                  {selectedIncident.assignedUser ? (
                    <div className="flex items-center gap-3 border border-white/[.04] rounded-xl p-3 bg-[#0D1326]/30">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold border border-violet-500/30">
                        {selectedIncident.assignedUser.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-sm font-medium text-white truncate" title={selectedIncident.assignedUser.email}>
                        {selectedIncident.assignedUser.email.split('@')[0]}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 border border-white/[.04] border-dashed rounded-xl p-3 bg-white/[.02] text-[#8891B0]">
                      <User2 className="w-8 h-8 p-1.5 rounded-full bg-white/5 opacity-50" />
                      <div className="text-xs italic">Unassigned</div>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="text-[10px] font-semibold text-[#8891B0] uppercase tracking-wider mb-2">Notification Status</h4>
                  <div className="border border-white/[.04] rounded-xl p-3 bg-[#0D1326]/30">
                    <IncidentNotificationStatus incidentId={selectedIncident.id} />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 opacity-50">
                <Search className="w-8 h-8 mx-auto mb-2 text-[#8891B0]" />
                <p className="text-xs text-[#8891B0]">Context will appear here</p>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
