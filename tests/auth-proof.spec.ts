import { test, expect } from './fixtures/auth.fixture';

const targetUrl = 'https://crm-v01-ciwcq6yt1-arunesh-s-projects.vercel.app';

test.describe('Proof of Authentication via Fixture', () => {
  const identities = [
    { id: 'audit-id-user-a', expectedRole: 'USER', expectedTenant: 'tenant-a-id' },
    { id: 'audit-id-admin-a', expectedRole: 'ADMIN', expectedTenant: 'tenant-a-id' },
    { id: 'audit-id-user-b', expectedRole: 'USER', expectedTenant: 'tenant-b-id' },
  ];

  for (const identity of identities) {
    test(`Authenticate as ${identity.id}`, async ({ page, injectAuth }) => {
      await injectAuth(identity.id);
      
      const res = await page.goto(`${targetUrl}/api/health`);
      expect(res?.status()).toBe(200);
      
      const resTickets = await page.goto(`${targetUrl}/api/tickets`);
      // Since it's a GET, it returns JSON and Next.js processes it.
      if (identity.expectedRole === 'USER' || identity.expectedRole === 'ADMIN') {
        expect(resTickets?.status()).toBe(200);
      }
      
      const resDiagnostic = await page.goto(`${targetUrl}/api/diagnostic`);
      if (identity.expectedRole === 'ADMIN') {
        expect(resDiagnostic?.status()).toBe(200);
      } else {
        expect(resDiagnostic?.status()).toBe(403);
      }
      
      // Let's also go to the actual UI Dashboard to ensure it loads
      const resDashboard = await page.goto(`${targetUrl}/dashboard`);
      expect(resDashboard?.status()).toBe(200);
      const dashboardText = await page.innerText('body');
      console.log(`Identity ${identity.id} successfully loaded dashboard.`);
    });
  }
});
