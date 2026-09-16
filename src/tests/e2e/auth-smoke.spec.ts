import { test, expect } from './fixtures/auth.fixture';

test.describe('E2E Authentication Smoke Test', () => {
  test('Admin A context resolves correctly', async ({ adminPage }) => {
    // Navigate to a protected page
    await adminPage.goto('/dashboard');
    
    // We expect the page to load successfully instead of redirecting to /sign-in
    await expect(adminPage).toHaveURL(/.*dashboard/);
    
    // If there is a profile or name element on the dashboard, we can verify it.
    // For now, just checking that it doesn't redirect is a strong signal that
    // requireAuth() accepted the load-test token.
    const bodyText = await adminPage.locator('body').innerText();
    expect(bodyText).not.toContain('Sign In');
  });

  test('Employee A context resolves correctly', async ({ empAPage }) => {
    await empAPage.goto('/dashboard');
    await expect(empAPage).toHaveURL(/.*dashboard/);
    const bodyText = await empAPage.locator('body').innerText();
    expect(bodyText).not.toContain('Sign In');
  });
});
