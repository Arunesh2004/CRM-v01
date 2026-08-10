export class ProviderNotImplementedError extends Error {
  constructor(providerName: string, feature: string = 'functionality') {
    super(`${providerName} adapter is configured but missing implementation for ${feature}.`);
    this.name = 'ProviderNotImplementedError';
  }
}
