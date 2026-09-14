export class ProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderConfigurationError';
  }
}

export class ProviderAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderAuthenticationError';
  }
}

export class ProviderAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderAuthorizationError';
  }
}

export class ProviderRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderTransientError';
  }
}

export class ProviderTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderPermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderPermanentError';
  }
}

export class ProviderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderValidationError';
  }
}
