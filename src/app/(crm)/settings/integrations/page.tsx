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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communication Providers</h1>
        <p className="text-muted-foreground">Manage your infrastructure providers and credentials. Integrations are isolated by tenant.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REQUIRED_PROVIDERS.map((providerDef) => {
          const integration = getIntegrationData(providerDef.id);
          const isDemo = !integration;

          return (
            <Card key={providerDef.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{providerDef.name}</CardTitle>
                    <div className="text-xs text-muted-foreground">{providerDef.description}</div>
                  </div>
                  <Badge variant={isDemo ? 'secondary' : 'default'}>
                    {isDemo ? 'Demo Mode' : 'Production'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isDemo ? (
                  <div className="bg-muted/50 p-3 rounded-md border text-sm text-muted-foreground">
                    Currently using the default Demo Provider. Simulated records will be generated automatically.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      {integration.status === 'ACTIVE' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium">
                        Status: <span className={integration.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'}>{integration.status}</span>
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Credentials are masked and encrypted (AES-256-GCM).
                    </div>
                    
                    {integration.lastCheckedAt && (
                      <div className="text-xs text-muted-foreground">
                        Last checked: {formatDistanceToNow(new Date(integration.lastCheckedAt), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <Dialog open={selectedProvider?.id === providerDef.id} onOpenChange={(open) => !open && setSelectedProvider(null)}>
                    <DialogTrigger render={<Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => setSelectedProvider(providerDef)} />}>
                      <Settings className="w-4 h-4" />
                      Configure
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Configure {providerDef.name} Credentials</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="text-sm text-muted-foreground">
                          Enter credentials as a JSON object (e.g. `&#123;&quot;provider&quot;:&quot;twilio&quot;,&quot;sid&quot;:&quot;...&quot;&#125;`). 
                          Secrets will be encrypted immediately and are never returned to the frontend.
                        </div>
                        <Input 
                          placeholder='{"provider": "twilio", "key": "secret"}' 
                          value={credentialsJson}
                          onChange={e => setCredentialsJson(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setSelectedProvider(null)}>Cancel</Button>
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
                      <Button variant="outline" size="icon" onClick={() => handleTestConnection(providerDef.id as any)} title="Test Connection">
                        <Plug className="w-4 h-4" />
                      </Button>
                      <Button variant="danger" size="icon" onClick={() => handleDelete(providerDef.id as any)} title="Remove Integration">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
