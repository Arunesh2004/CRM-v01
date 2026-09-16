import { test, expect } from './fixtures/auth.fixture';

test.describe('Phase 15B: Internal Chat E2E (Dual-Browser)', () => {
  test('Admin sends message -> Employee receives realtime -> Employee replies', async ({ adminPage, empAPage }) => {
    // Both users navigate to Chat
    await adminPage.goto('/communication/chat');
    await empAPage.goto('/communication/chat');
    
    // Wait for the UI to load
    await expect(adminPage.locator('h1', { hasText: 'Internal Chat' }).or(adminPage.locator('h1', { hasText: 'Inbox' }).or(adminPage.getByRole('heading'))).first()).toBeVisible({ timeout: 15000 });
    
    console.log('ADMIN PAGE HTML:', await adminPage.content());
    // Select the seeded conversation (Test MEMBER for Admin, Test TENANT_ADMIN for Emp A)
    await adminPage.locator('text=Test MEMBER').click();
    await empAPage.locator('text=Test TENANT_ADMIN').click();
    
    const messageInputAdmin = adminPage.locator('input[placeholder="Type a message..."], textarea[placeholder="Type a message..."]').first();
    
    const testMessage = `E2E Test from Admin - ${Date.now()}`;
    await messageInputAdmin.waitFor({ state: 'visible', timeout: 10000 });
    await messageInputAdmin.fill(testMessage);
    await messageInputAdmin.press('Enter');

    // Admin sees message in their own DOM
    await expect(adminPage.locator(`text=${testMessage}`).first()).toBeVisible();

    // Employee sees the message in their DOM (with or without refresh depending on realtime)
    if (process.env.NEXT_PUBLIC_PUSHER_KEY) {
      await expect(empAPage.locator(`text=${testMessage}`).first()).toBeVisible({ timeout: 5000 });
    } else {
      await empAPage.reload();
      // Need to re-select conversation after reload
      await empAPage.locator('text=Test TENANT_ADMIN').click();
      await expect(empAPage.locator(`text=${testMessage}`).first()).toBeVisible({ timeout: 5000 });
    }

    // Employee replies
    const replyMessage = `E2E Reply from Employee - ${Date.now()}`;
    const messageInputEmp = empAPage.locator('input[placeholder="Type a message..."], textarea[placeholder="Type a message..."]').first();
    await messageInputEmp.fill(replyMessage);
    await messageInputEmp.press('Enter');

    // Employee sees their own reply
    await expect(empAPage.locator(`text=${replyMessage}`).first()).toBeVisible();

    // Admin sees the reply
    if (process.env.NEXT_PUBLIC_PUSHER_KEY) {
      await expect(adminPage.locator(`text=${replyMessage}`).first()).toBeVisible({ timeout: 5000 });
    } else {
      await adminPage.reload();
      await adminPage.locator('text=Test MEMBER').click();
      await expect(adminPage.locator(`text=${replyMessage}`).first()).toBeVisible({ timeout: 5000 });
    }
    
    // Reload and verify persistence
    await adminPage.reload();
    await adminPage.locator('text=Test MEMBER').click();
    await expect(adminPage.locator(`text=${replyMessage}`).first()).toBeVisible({ timeout: 10000 });
  });
});
