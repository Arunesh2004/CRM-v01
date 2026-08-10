export type ProviderHealthStatus = 'active' | 'missing_credentials' | 'disabled' | 'error';

export interface ProviderHealth {
  status: ProviderHealthStatus;
  message?: string;
  providerName: string;
}

export interface BaseProvider {
  checkHealth(): Promise<ProviderHealth>;
}

export interface ProviderContext {
  tenantId: string;
  actorId: string;
}
