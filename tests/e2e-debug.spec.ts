import { test, expect } from '@playwright/test';

test('Debug Login Flow', async ({ page }) => {
  const targetUrl = 'https://crm-v01-bjlvfvqas-arunesh-s-projects.vercel.app';
  console.log('Navigating to sign-in...');
  await page.goto(`${targetUrl}/sign-in`, { waitUntil: 'networkidle' });
  
  await page.waitForSelector('input[name="identifier"]');
  await page.fill('input[name="identifier"]', 'demo@company.com');
  await page.click('button.cl-formButtonPrimary');
  
  await page.waitForSelector('input[name="password"]');
  await page.fill('input[name="password"]', 'DemoCRM@2026Secure');
  await page.click('button.cl-formButtonPrimary');
  
  console.log('Waiting for dashboard...');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(5000);
  
  const currentUrl = page.url();
  console.log('--- CURRENT URL ---');
  console.log(currentUrl);
  
  const bodyText = await page.innerText('body');
  console.log('--- BODY TEXT ---');
  console.log(bodyText.substring(0, 2000));
});
