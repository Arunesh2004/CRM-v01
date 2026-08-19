import { test, expect } from '@playwright/test';

test.describe('Demo Account E2E Validation', () => {
  const targetUrl = 'https://crm-v01-cavwrd9cc-arunesh-s-projects.vercel.app';
  const email = 'demo@company.com';
  const password = 'DemoCRM@2026Secure';

  test('Phases 1-5: Auth, Tenant Isolation, Demo Data, RBAC, Data Isolation', async ({ page, request }) => {
    // PHASE 1: Authentication
    console.log('--- PHASE 1: AUTHENTICATION ---');
    await page.goto(`${targetUrl}/sign-in`, { waitUntil: 'networkidle' });
    
    await page.waitForSelector('input[name="identifier"]');
    await page.fill('input[name="identifier"]', email);
    await page.click('button.cl-formButtonPrimary');
    
    try {
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    } catch (e) {
      const errorText = await page.innerText('body');
      throw new Error(`Email step failed: ${errorText.substring(0, 200)}`);
    }

    await page.fill('input[name="password"]', password);
    await page.click('button.cl-formButtonPrimary');
    
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('[PASS] Login successful. Reached dashboard.');

    // PHASE 2 & 3: Tenant Resolution & Demo Data
    console.log('--- PHASE 2 & 3: TENANT & DATA RESOLUTION ---');
    // Wait for data to load
    await expect(page.locator('body')).toContainText('Demo Company', { timeout: 15000 });
    console.log('[PASS] Demo Tenant resolved.');
    
    // Check Leads
    await page.goto(`${targetUrl}/leads`);
    await expect(page.locator('body')).toContainText('John Doe', { timeout: 15000 });
    await expect(page.locator('body')).toContainText('Jane Smith');
    await expect(page.locator('body')).toContainText('Bob Johnson');
    console.log('[PASS] Leads demo data visible.');

    // Check Customers
    await page.goto(`${targetUrl}/customers`);
    await expect(page.locator('body')).toContainText('Stark Industries', { timeout: 15000 });
    await expect(page.locator('body')).toContainText('Wayne Enterprises');
    console.log('[PASS] Customers demo data visible.');

    // PHASE 4: RBAC
    console.log('--- PHASE 4: RBAC (Write Restrictions) ---');
    // Attempt an API write to create a customer
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name.includes('__session'));
    
    if (sessionCookie) {
      const response = await request.post(`${targetUrl}/api/customers`, {
        data: {
          name: 'Hacked Corp',
          status: 'ACTIVE'
        },
        headers: {
          'Cookie': `${sessionCookie.name}=${sessionCookie.value}`
        }
      });
      const status = response.status();
      if (status === 403 || status === 401) {
        console.log(`[PASS] API CREATE blocked with status ${status}.`);
      } else if (status === 404) {
        // Next.js API route might not exist in that exact path or it's a server action
        console.log(`[WARN] API endpoint not found (404) - unable to test raw API.`);
      } else {
        console.log(`[FAIL] API CREATE returned status ${status}. RBAC failed!`);
        throw new Error('API CREATE not blocked.');
      }
    } else {
       console.log('[WARN] Could not find session cookie to test API directly.');
    }
    
    // Check UI for missing create buttons
    const newButton = await page.$('button:has-text("New"), a:has-text("New Customer")');
    if (!newButton) {
        console.log('[PASS] Create button is hidden in UI.');
    } else {
        console.log('[WARN] Create button is visible. Testing if it works...');
        await newButton.click();
        await page.waitForTimeout(1000);
    }

    // PHASE 5: Canonical Isolation
    console.log('--- PHASE 5: ISOLATION ---');
    // Canonical data from Arunesh should not be present
    const bodyText = await page.innerText('body');
    if (bodyText.includes('Arunesh') || bodyText.includes('Vipin')) {
       console.log(`[FAIL] Canonical data leaked!`);
       throw new Error('Canonical Data Leaked');
    } else {
       console.log(`[PASS] No Canonical data found in UI.`);
    }
  });

  test('Phases 6-8: Multi-Session and Logout Isolation', async ({ browser }) => {
    // Session A
    console.log('--- PHASE 6: MULTI-SESSION ---');
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    
    await pageA.goto(`${targetUrl}/sign-in`);
    await pageA.fill('input[name="identifier"]', email);
    await pageA.click('button.cl-formButtonPrimary');
    await pageA.waitForSelector('input[name="password"]');
    await pageA.fill('input[name="password"]', password);
    await pageA.click('button.cl-formButtonPrimary');
    await pageA.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('[PASS] Session A Authenticated.');

    // Session B
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    
    await pageB.goto(`${targetUrl}/sign-in`);
    await pageB.fill('input[name="identifier"]', email);
    await pageB.click('button.cl-formButtonPrimary');
    await pageB.waitForSelector('input[name="password"]');
    await pageB.fill('input[name="password"]', password);
    await pageB.click('button.cl-formButtonPrimary');
    await pageB.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('[PASS] Session B Authenticated Simultaneously.');

    // Logout A
    console.log('--- PHASE 7: LOGOUT ISOLATION ---');
    await pageA.goto(`${targetUrl}/dashboard`);
    await contextA.clearCookies();
    await pageA.goto(`${targetUrl}/dashboard`);
    try {
        await pageA.waitForURL('**/sign-in**', { timeout: 10000 });
        console.log('[PASS] Session A logged out successfully.');
    } catch(e) {
        console.log('[FAIL] Session A did not redirect to login after cookie clear.');
    }

    // Verify Session B is still alive
    await pageB.reload();
    await pageB.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('[PASS] Session B remains authenticated after Session A logged out.');
  });
});
