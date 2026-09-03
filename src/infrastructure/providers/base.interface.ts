export type ProviderHealthStatus = 'READY' | 'MISSING_CREDENTIALS' | 'MISCONFIGURED' | 'UNAVAILABLE';
export type ProviderCriticality = 'CRITICAL' | 'DEGRADED' | 'OPTIONAL';

export interface ProviderHealth {
  status: ProviderHealthStatus;
  providerName: string;
  criticality: ProviderCriticality;
  reason?: string;
}

export interface BaseProvider {
  checkHealth(): Promise<ProviderHealth> | ProviderHealth;
}

export interface ProviderContext {
  tenantId: string;
  actorId: string;
}

