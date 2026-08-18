import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testMatch: '**/*.spec.ts',
  testIgnore: '**/*.test.ts',
  timeout: 30000,
  retries: 1,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
