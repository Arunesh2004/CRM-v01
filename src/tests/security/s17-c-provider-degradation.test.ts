import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnvironment } from '@/lib/config/env';
import { ProviderFactory } from '@/lib/providers/provider.factory';
import { ResendProvider, MockEmailProvider } from '@/lib/providers/email/resend.provider';
import { TwilioProvider, MockTelephonyProvider } from '@/lib/providers/telephony/twilio.provider';
import { WhatsAppProvider, MockMessagingProvider } from '@/lib/providers/messaging/whatsapp.provider';

describe('S17-C Optional Provider Degradation (Forensic Audit)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Core Security Configuration', () => {
    it('should throw CRITICAL STARTUP FAILURE if DATABASE_URL is missing in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'production';
      delete process.env.DATABASE_URL;
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'valid';
      process.env.CLERK_SECRET_KEY = 'valid';
      process.env.CLERK_WEBHOOK_SECRET = 'valid';
      process.env.ENCRYPTION_KEY = 'valid';

      expect(() => validateEnvironment()).toThrow(/CRITICAL STARTUP FAILURE.*DATABASE_URL/);
    });

    it('should throw CRITICAL STARTUP FAILURE if Clerk configuration is missing', () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'production';
      process.env.DATABASE_URL = 'postgres://fake';
      delete process.env.CLERK_SECRET_KEY;
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'valid';
      process.env.CLERK_WEBHOOK_SECRET = 'valid';
      process.env.ENCRYPTION_KEY = 'valid';

      expect(() => validateEnvironment()).toThrow(/CRITICAL STARTUP FAILURE.*CLERK_SECRET_KEY/);
    });

    it('should throw CRITICAL STARTUP FAILURE if ENCRYPTION_KEY is missing', () => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'production';
      process.env.DATABASE_URL = 'postgres://fake';
      process.env.CLERK_SECRET_KEY = 'valid';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'valid';
      process.env.CLERK_WEBHOOK_SECRET = 'valid';
      delete process.env.ENCRYPTION_KEY;

      expect(() => validateEnvironment()).toThrow(/CRITICAL STARTUP FAILURE.*ENCRYPTION_KEY/);
    });
  });

  describe('Optional Provider Degradation (Production)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.VERCEL_ENV = 'production';
      process.env.DATABASE_URL = 'postgres://fake';
      process.env.CLERK_SECRET_KEY = 'valid';
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'valid';
      process.env.CLERK_WEBHOOK_SECRET = 'valid';
      process.env.ENCRYPTION_KEY = 'valid';
    });

    it('should NOT throw CRITICAL STARTUP FAILURE if RESEND_API_KEY is missing', () => {
      delete process.env.RESEND_API_KEY;
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should NOT throw CRITICAL STARTUP FAILURE if TWILIO_ACCOUNT_SID is missing', () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should NOT throw CRITICAL STARTUP FAILURE if WHATSAPP_TOKEN is missing', () => {
      delete process.env.WHATSAPP_TOKEN;
      expect(() => validateEnvironment()).not.toThrow();
    });

    it('ProviderFactory returns MockEmailProvider safely if RESEND_API_KEY is missing', () => {
      delete process.env.RESEND_API_KEY;
      const provider = ProviderFactory.getEmailProvider();
      expect(provider).toBeInstanceOf(MockEmailProvider);
    });

    it('ProviderFactory returns ResendProvider if RESEND_API_KEY is configured', () => {
      process.env.RESEND_API_KEY = 're_test_123';
      const provider = ProviderFactory.getEmailProvider();
      expect(provider).toBeInstanceOf(ResendProvider);
    });

    it('MockEmailProvider explicitly returns EMAIL_PROVIDER_NOT_CONFIGURED and no fake success', async () => {
      delete process.env.RESEND_API_KEY;
      const provider = ProviderFactory.getEmailProvider();
      const res = await provider.sendEmail('tenant1', { to: 'test@example.com', subject: 'Test', html: '<p>Hi</p>' });
      
      expect(res.success).toBe(false);
      expect(res.error).toBe('EMAIL_PROVIDER_NOT_CONFIGURED');
    });

    it('MockTelephonyProvider explicitly returns TELEPHONY_PROVIDER_NOT_CONFIGURED and no fake success', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      const provider = ProviderFactory.getTelephonyProvider();
      const res = await provider.sendSms('tenant1', { to: '+1234567890', text: 'Test' });
      
      expect(res.success).toBe(false);
      expect(res.error).toBe('TELEPHONY_PROVIDER_NOT_CONFIGURED');
    });

    it('MockMessagingProvider explicitly returns MESSAGING_PROVIDER_NOT_CONFIGURED and no fake success', async () => {
      delete process.env.WHATSAPP_TOKEN;
      const provider = ProviderFactory.getMessagingProvider();
      const res = await provider.sendMessage('tenant1', { to: '+1234567890', type: 'text', text: 'Test' });
      
      expect(res.success).toBe(false);
      expect(res.error).toBe('MESSAGING_PROVIDER_NOT_CONFIGURED');
    });
  });
});
