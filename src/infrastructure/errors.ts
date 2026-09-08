export class ProviderNotImplementedError extends Error {
  constructor(providerName: string, feature: string = 'functionality') {
    super(`${providerName} adapter is configured but missing implementation for ${feature}.`);
    this.name = 'ProviderNotImplementedError';
  }
}

export class IdempotencyConflictError extends Error {
  code = 'IDEMPOTENCY_CONFLICT';
  constructor(message: string = 'Idempotency Conflict: The request conflicts with a previously processed operation.') {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}
