import { Logger } from '@/lib/logger/logger';

import { EmailProviderFactory } from '../../../lib/providers/email/email.factory';

export interface EmailProvider {
  sendInvitation(email: string, inviteUrl: string, options?: { companyName?: string, roleName?: string }): Promise<void>;
}

export class CoreEmailProvider implements EmailProvider {
  async sendInvitation(email: string, inviteUrl: string, options?: { companyName?: string, roleName?: string }): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    
    // In production, we MUST use the real factory to ensure fail-closed behavior.
    if (isProduction) {
      const provider = EmailProviderFactory.getProvider(); // Will throw if RESEND_API_KEY is missing
      const result = await provider.sendEmail('system', {
        to: email,
        subject: `You have been invited to join ${options?.companyName || 'the CRM'}`,
        html: `<p>You have been invited to join ${options?.companyName || 'the CRM'} as a ${options?.roleName || 'member'}.</p><p><a href="${inviteUrl}">Click here to accept the invitation</a></p>`,
        text: `You have been invited to join ${options?.companyName || 'the CRM'} as a ${options?.roleName || 'member'}. Please visit this link to accept: ${inviteUrl}`
      });
      if (!result.success) {
        throw new Error(`Email provider failed to send invitation: ${result.error}`);
      }
      return;
    }

    // Development/Test fallback logging
    Logger.info('[CoreEmailProvider] Simulated invite email', {
      company: options?.companyName,
      role: options?.roleName,
      inviteUrl, // will have URL token stripped by redact.ts redactUrlSecrets
    });
  }
}

export const emailProvider = new CoreEmailProvider();

