import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.test for E2E tests
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
// Only override Clerk keys from the test instance, NOT the database URL
const clerkTestKeys = dotenv.parse(fs.readFileSync(path.resolve(process.cwd(), 'temp_db_pull/.env')));
if (clerkTestKeys.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = clerkTestKeys.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}
if (clerkTestKeys.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY = clerkTestKeys.CLERK_SECRET_KEY;
}

export default defineConfig({
  testMatch: 'e2e/**/*.spec.ts',
  testIgnore: '**/*.test.ts',
  timeout: 60000,
  retries: 0,
  use: {
    launchOptions: {
      args: ['--no-proxy-server']
    },
    trace: 'on',
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'clerk setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['clerk setup'],
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--proxy-server="direct://"', '--proxy-bypass-list=*']
        }
      },
    },
  ],
  webServer: {
    command: 'npx cross-env NODE_ENV=test next dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
      // Explicitly force the E2E database to prevent accidental production bleed
      // from temp_db_pull/.env
      DATABASE_URL: 'postgresql://e2e_user:e2e_password@127.0.0.1:5435/e2e_db',
    },
  },
});
