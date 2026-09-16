import { test as base, BrowserContext, Page } from '@playwright/test';
import * as jwt from 'jsonwebtoken';

const E2E_ADMIN_A_ID = '00000000-0000-4000-8000-000000000001';
const E2E_EMP_A_ID = '00000000-0000-4000-8000-000000000002';
const E2E_EMP_B_ID = '00000000-0000-4000-8000-000000000003';

function createLoadTestToken(userId: string) {
  const secret = process.env.LOAD_TEST_SECRET || 'e2e-secret-key-12345';
  return jwt.sign(
    { purpose: 'crm-phase26-load-test' },
    secret,
    {
      subject: userId,
      audience: 'crm-staging-load-test',
      issuer: 'crm-phase26-runner',
      expiresIn: '1h',
      algorithm: 'HS256'
    }
  );
}

export type AuthFixtures = {
  adminContext: BrowserContext;
  adminPage: Page;
  empAContext: BrowserContext;
  empAPage: Page;
  empBContext: BrowserContext;
  empBPage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-load-test-token': createLoadTestToken(E2E_ADMIN_A_ID)
      }
    });
    await context.route('**/*.clerk.accounts.dev/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Clerk = { load: () => Promise.resolve(), addListener: () => {}, isReady: () => true, session: null, user: null };' }));
    await context.route('**/__clerk/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Clerk = { load: () => Promise.resolve(), addListener: () => {}, isReady: () => true, session: null, user: null };' }));
    await use(context);
    await context.close();
  },
  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
  },
  
  empAContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-load-test-token': createLoadTestToken(E2E_EMP_A_ID)
      }
    });
    await context.route('**/*.clerk.accounts.dev/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Clerk = { load: () => Promise.resolve(), addListener: () => {}, isReady: () => true, session: null, user: null };' }));
    await context.route('**/__clerk/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Clerk = { load: () => Promise.resolve(), addListener: () => {}, isReady: () => true, session: null, user: null };' }));
    await use(context);
    await context.close();
  },
  empAPage: async ({ empAContext }, use) => {
    const page = await empAContext.newPage();
    await use(page);
  },

  empBContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-load-test-token': createLoadTestToken(E2E_EMP_B_ID)
      }
    });
    await context.route('**/*.clerk.accounts.dev/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Clerk = { load: () => Promise.resolve(), addListener: () => {}, isReady: () => true, session: null, user: null };' }));
    await context.route('**/__clerk/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.Clerk = { load: () => Promise.resolve(), addListener: () => {}, isReady: () => true, session: null, user: null };' }));
    await use(context);
    await context.close();
  },
  empBPage: async ({ empBContext }, use) => {
    const page = await empBContext.newPage();
    await use(page);
  }
});

export { expect } from '@playwright/test';
