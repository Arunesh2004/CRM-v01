import { test, expect } from './fixtures/auth.fixture';
import * as fs from 'fs';

const targetUrl = 'https://crm-v01-ciwcq6yt1-arunesh-s-projects.vercel.app';

test.describe('Phase 18 Live Validation - Deep Investigation', () => {
  const customerIdTenantA = 'audit-customer-a';
  const customerIdTenantB = 'audit-customer-b';

  test('Investigate Tenant Isolation Response', async ({ page, injectAuth }) => {
    await injectAuth('audit-id-user-b');
    await page.goto(`${targetUrl}/customers/${customerIdTenantA}`);
    
    // Dump text to see what is actually rendered
    const bodyText = await page.innerText('body');
    const html = await page.content();
    console.log('--- HTML DUMP START ---');
    console.log(bodyText.substring(0, 1000));
    console.log('--- HTML DUMP END ---');
    
    // Write full HTML to file for inspection
    fs.writeFileSync('isolation-dump.html', html);
  });
});
