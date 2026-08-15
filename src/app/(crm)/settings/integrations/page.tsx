'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getTenantIntegrationsAction, testIntegrationConnectionAction, updateIntegrationCredentialsAction, deleteIntegrationAction } from '@/modules/settings/integration.actions';
import { Loader2, Settings, AlertCircle, CheckCircle2, Trash2, Plug } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const REQUIRED_PROVIDERS = [
  { id: 'TELEPHONY', name: 'Calling', description: 'Voice and telephony infrastructure' },
  { id: 'INTERNAL_CHAT', name: 'Internal Chat', description: 'Realtime messaging' },
  { id: 'VIDEO', name: 'Video Meetings', description: 'WebRTC video rooms' },
  { id: 'STORAGE', name: 'File Storage', description: 'Document and media storage' },
  { id: 'EMAIL', name: 'Email', description: 'Outbound and inbound parsing' }
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Dialog state
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [credentialsJson, setCredentialsJson] = useState('');

  const load = async () => {
    const res = await getTenantIntegrationsAction();
    if (res.success && res.data) {
      setIntegrations(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const getIntegrationData = (providerType: string) => {
    return integrations.find(i => i.provider === providerType);
  };

  const handleTestConnection = async (providerType: any) => {
    toast.info('Testing connection...');
    const res = await testIntegrationConnectionAction(providerType);
    if (res.success) {
      toast.success('Connection successful');
      load();
    } else {
      toast.error(res.error || 'Connection failed');
    }
  };

  const handleSaveCredentials = async () => {
    if (!selectedProvider) return;
    setIsUpdating(true);
    const res = await updateIntegrationCredentialsAction(selectedProvider.id, credentialsJson);
    if (res.success) {
      toast.success('Credentials updated securely');
      load();
      setSelectedProvider(null);
    } else {
      toast.error(res.error || 'Update failed');
    }
    setIsUpdating(false);
  };

  const handleDelete = async (providerType: any) => {
    const res = await deleteIntegrationAction(providerType);
    if (res.success) {
      toast.success('Integration removed');
      load();
    } else {
      toast.error(res.error || 'Failed to remove');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header Panel */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Communication Providers</h1>
            <p className="text-sm text-[#8891B0] mt-1">Manage your infrastructure providers and credentials. Integrations are isolated by department.</p>
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-cyan-500/10 items-center justify-center border border-cyan-500/20">
            <Plug className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REQUIRED_PROVIDERS.map((providerDef) => {
          const integration = getIntegrationData(providerDef.id);
          const isDemo = !integration;

          return (
            <div key={providerDef.id} className="glass-panel p-6 flex flex-col h-full transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:shadow-violet-500/5 group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-display font-semibold text-white">{providerDef.name}</h3>
                  <div className="text-xs text-[#8891B0] mt-0.5">{providerDef.description}</div>
                </div>
                <Badge variant={isDemo ? 'slate' : 'violet'}>
                  {isDemo ? 'Demo Mode' : 'Production'}
                </Badge>
              </div>

              <div className="flex-1 space-y-4 mb-6">
                {isDemo ? (
                  <div className="bg-[#0D1326]/50 p-4 rounded-xl border border-white/[.04] text-xs text-[#8891B0] leading-relaxed">
                    Currently using the default Demo Provider. Simulated records will be generated automatically.
                  </div>
                ) : (
                  <div className="space-y-3 bg-[#0D1326]/30 p-4 rounded-xl border border-white/[.02]">
                    <div className="flex items-center gap-2 text-sm">
                      {integration.status === 'ACTIVE' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span className="font-medium text-[#E7EAF5]">
                        Status: <span className={integration.status === 'ACTIVE' ? 'text-emerald-400' : 'text-rose-400'}>{integration.status}</span>
                      </span>
                    </div>
                    
                    <div className="text-xs text-[#8891B0]">
                      Credentials are masked and encrypted (AES-256-GCM).
                    </div>
                    
                    {integration.lastCheckedAt && (
                      <div className="text-[10px] text-[#8891B0]/70 font-mono">
                        Last checked: {formatDistanceToNow(new Date(integration.lastCheckedAt), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/[.04] flex gap-2 mt-auto">
                <Dialog open={selectedProvider?.id === providerDef.id} onOpenChange={(open) => !open && setSelectedProvider(null)}>
                  <DialogTrigger render={<Button variant="ghost" size="sm" className="flex-1 gap-2 bg-white/5 hover:bg-white/10" onClick={() => setSelectedProvider(providerDef)} />}>
                    <Settings className="w-4 h-4" />
                    Configure
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configure {providerDef.name} Credentials</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="text-sm text-[#8891B0]">
                        Enter credentials as a JSON object (e.g. `&#123;&quot;provider&quot;:&quot;twilio&quot;,&quot;sid&quot;:&quot;...&quot;&#125;`). 
                        Secrets will be encrypted immediately and are never returned to the frontend.
                      </div>
                      <Input 
                        placeholder='{"provider": "twilio", "key": "secret"}' 
                        value={credentialsJson}
                        onChange={e => setCredentialsJson(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" onClick={() => setSelectedProvider(null)}>Cancel</Button>
                        <Button onClick={handleSaveCredentials} disabled={isUpdating || !credentialsJson}>
                          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Securely
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {!isDemo && (
                  <>
                    <Button variant="ghost" size="icon" className="bg-white/5 hover:bg-white/10 hover:text-cyan-400" onClick={() => handleTestConnection(providerDef.id as any)} title="Test Connection">
                      <Plug className="w-4 h-4" />
                    </Button>
                    <Button variant="danger" size="icon" onClick={() => handleDelete(providerDef.id as any)} title="Remove Integration">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
