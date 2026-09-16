import { test, expect } from './fixtures/auth.fixture';

test.describe('E2E Diagnosis', () => {
  test('Dump Chat Page HTML', async ({ adminPage }) => {
    await adminPage.goto('/communication/chat');
    // Wait for network idle or a short timeout
    await adminPage.waitForTimeout(5000);
    const html = await adminPage.content();
    console.log('--- HTML DUMP START ---');
    console.log(html);
    console.log('--- HTML DUMP END ---');
  });
});
