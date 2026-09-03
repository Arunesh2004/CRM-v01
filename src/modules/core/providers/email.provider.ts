import { Logger } from '@/lib/logger/logger';

export interface EmailProvider {
  sendInvitation(email: string, inviteUrl: string, options?: { companyName?: string, roleName?: string }): Promise<void>;
}

export class DemoEmailProvider implements EmailProvider {
  async sendInvitation(email: string, inviteUrl: string, options?: { companyName?: string, roleName?: string }): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
    
    if (isProduction) {
      Logger.warn('[DemoEmailProvider] A real email provider is required in production. Simulated send.');
    }

    // Log without embedding the full inviteUrl inline in the message string — let Logger/redact handle it
    Logger.info('[DemoEmailProvider] Simulated invite email', {
      company: options?.companyName,
      role: options?.roleName,
      inviteUrl, // will have URL token stripped by redact.ts redactUrlSecrets
    });
  }
}

// In a real application with a configured DI container, this would be injected.
// For now, we export a singleton instance of the demo provider.
export const emailProvider = new DemoEmailProvider();

