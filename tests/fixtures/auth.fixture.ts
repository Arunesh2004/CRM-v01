import { test as base } from '@playwright/test';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.staging.secrets') });

function generateToken(payloadOverrides: any, secret: string, timeOffsetMs: number = 0): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    purpose: 'crm-phase26-load-test',
    iss: 'crm-phase26-runner',
    aud: 'crm-staging-load-test',
    iat: Math.floor(Date.now() / 1000) + Math.floor(timeOffsetMs / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 + Math.floor(timeOffsetMs / 1000),
    ...payloadOverrides
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const hmac = crypto.createHmac('sha256', Buffer.from(secret, 'utf-8'));
  hmac.update(signatureInput);
  const signature = hmac.digest('base64url');
  
  return `${signatureInput}.${signature}`;
}

type AuthFixtures = {
  injectAuth: (userId: string) => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  injectAuth: async ({ page }, use) => {
    await use(async (userId: string) => {
      const secret = process.env.LOAD_TEST_SECRET;
      if (!secret) {
        throw new Error('LOAD_TEST_SECRET is missing from .env.staging.secrets');
      }
      const token = generateToken({ sub: userId }, secret);
      // Playwright injects this header into all requests from this page, including Server Actions and data fetches!
      await page.setExtraHTTPHeaders({ 'x-load-test-token': token });
    });
  },
});
export { expect } from '@playwright/test';
