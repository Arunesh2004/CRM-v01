export const features = {
  COMMUNICATION_MODE: process.env.COMMUNICATION_MODE || 'demo',
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'demo',
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'demo',
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'demo',
  CALL_PROVIDER: process.env.CALL_PROVIDER || 'demo',
} as const;

export type ProviderType = 'demo' | 'real' | 'local';
