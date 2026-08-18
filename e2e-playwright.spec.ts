import { test, expect } from '@playwright/test';

test('Initial Admin Bootstrap via UI', async ({ page }) => {
  // Set up route interceptor for Vercel bypass header
  // Crucial: Only inject into Vercel requests, NOT cross-origin requests (like Clerk CDN)
  await page.route('**/*', route => {
    const request = route.request();
    if (request.url().includes('crm-v01-bb2k4wja4-arunesh-s-projects.vercel.app')) {
      const headers = { ...request.headers(), 'x-vercel-protection-bypass': 'TheColorOfTheSkyIsBlue0ButItIsBl' };
      route.continue({ headers });
    } else {
      route.continue();
    }
  });

  // Go to preview URL
  await page.goto('https://crm-v01-bb2k4wja4-arunesh-s-projects.vercel.app', { waitUntil: 'domcontentloaded' });
  
  // Wait for redirect to sign-in
  await page.waitForURL(/.*sign-in.*/);
  
  // Fill email
  await page.fill('input[name="identifier"]', 'crm-phase1-admin-test@canonical.com');
  await page.click('button:has-text("Continue")');
  
  // Fill password
  await page.waitForSelector('input[name="password"]');
  await page.fill('input[name="password"]', 'TestPassword123!');
  await page.click('button:has-text("Continue")');
  
  // Wait for redirect to dashboard or onboarding
  await page.waitForURL(/.*(dashboard|onboarding).*/, { timeout: 15000 });
  
  const currentUrl = page.url();
  console.log('Final URL after login:', currentUrl);
  
  expect(currentUrl).toMatch(/.*(dashboard|onboarding).*/);
});
