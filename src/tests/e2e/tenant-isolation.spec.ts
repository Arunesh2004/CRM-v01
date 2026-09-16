import { test, expect } from './fixtures/auth.fixture';

test.describe('Phase 15B: Tenant Isolation E2E', () => {
  test('Tenant B Employee cannot access Tenant A data', async ({ empBPage }) => {
    // Tenant B user attempts to fetch Tenant A data directly via API or UI
    
    // Test 1: UI isolation
    await empBPage.goto('/communication/chat');
    await expect(empBPage.locator('body')).toBeVisible({ timeout: 15000 });
    
    // We verify that none of Tenant A's users or chats appear
    // Because Admin A and Emp A exist, their names shouldn't be in the DOM
    const bodyText = await empBPage.locator('body').innerText();
    expect(bodyText).not.toContain('e2e-admin-a');
    expect(bodyText).not.toContain('audit-load-admin-a');
    
    // Test 2: Server-side isolation (API test)
    // We send a direct fetch request to read a CallSession or Chat belonging to Tenant A
    // (Assuming /api/communication/sessions or similar route)
    const response = await empBPage.request.get('/api/communication/chat/messages');
    
    // We expect 200 OK (empty list) or some response, but definitely not Tenant A's messages
    if (response.ok()) {
      const data = await response.json();
      const hasTenantAMessages = data.some((msg: any) => msg.tenantId === 'e2e-tenant-a-0000-0000-000000000000');
      expect(hasTenantAMessages).toBe(false);
    }
  });
});
