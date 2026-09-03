import { test, expect } from './fixtures/auth.fixture';

const targetUrl = 'https://crm-v01-ciwcq6yt1-arunesh-s-projects.vercel.app';

test.describe('Phase 18 Live Validation - Server Actions & UI Mutations', () => {
  const customerIdTenantA = 'audit-customer-a';
  const customerIdTenantB = 'audit-customer-b';

  test('STEP 4A: Tenant Isolation - Tenant B cannot access Tenant A customer', async ({ page, injectAuth }) => {
    // Auth as B
    await injectAuth('audit-id-user-b');
    await page.goto(`${targetUrl}/customers/${customerIdTenantA}`);
    
    const bodyText = await page.innerText('body');
    const isError = bodyText.includes('Not Found') || bodyText.includes('Unauthorized') || bodyText.includes('404') || bodyText.includes('Error');
    const isRedirect = page.url() !== `${targetUrl}/customers/${customerIdTenantA}`;
    
    expect(isError || isRedirect).toBeTruthy();
  });

  test('STEP 4A: Tenant Isolation - Tenant A cannot access Tenant B customer', async ({ page, injectAuth }) => {
    // Auth as A
    await injectAuth('audit-id-user-a');
    await page.goto(`${targetUrl}/customers/${customerIdTenantB}`);
    
    const bodyText = await page.innerText('body');
    const isError = bodyText.includes('Not Found') || bodyText.includes('Unauthorized') || bodyText.includes('404') || bodyText.includes('Error');
    const isRedirect = page.url() !== `${targetUrl}/customers/${customerIdTenantB}`;
    
    expect(isError || isRedirect).toBeTruthy();
  });

  test('STEP 4B: IDOR/Mass Assignment - Attempt to manipulate form data', async ({ page, injectAuth }) => {
    // Auth as A and go to their own customer
    await injectAuth('audit-id-user-a');
    await page.goto(`${targetUrl}/customers/${customerIdTenantA}`);
    
    // Attempt to inject a hidden tenantId field into the update form (if one exists)
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'tenantId';
        input.value = 'tenant-b-id'; // Attempt to mass-assign this customer to Tenant B
        form.appendChild(input);
      }
    });

    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
       await submitBtn.click();
       await page.waitForTimeout(3000);
    }
  });

  test('STEP 4D: RBAC - User cannot access Admin Settings', async ({ page, injectAuth }) => {
    await injectAuth('audit-id-user-a');
    await page.goto(`${targetUrl}/settings/audit`);
    
    const bodyText = await page.innerText('body');
    const isError = bodyText.includes('Forbidden') || bodyText.includes('Unauthorized') || bodyText.includes('403') || bodyText.includes('404') || bodyText.includes('Not Found');
    const isRedirect = page.url() !== `${targetUrl}/settings/audit`;
    
    expect(isError || isRedirect).toBeTruthy();
  });
  
  test('STEP 4D: RBAC - Admin CAN access Admin Settings', async ({ page, injectAuth }) => {
    await injectAuth('audit-id-admin-a');
    await page.goto(`${targetUrl}/settings/audit`);
    
    const isRedirect = page.url() !== `${targetUrl}/settings/audit`;
    expect(isRedirect).toBeFalsy();
    
    // The page should not be an error page
    const bodyText = await page.innerText('body');
    const isError = bodyText.includes('Forbidden') || bodyText.includes('Unauthorized') || bodyText.includes('403') || bodyText.includes('404') || bodyText.includes('Not Found');
    expect(isError).toBeFalsy();
  });
});
