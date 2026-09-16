import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env.test for E2E tests
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
// Only override Clerk keys from the test instance, NOT the database URL
if (fs.existsSync(path.resolve(process.cwd(), 'temp_db_pull/.env'))) {
  const clerkTestKeys = dotenv.parse(fs.readFileSync(path.resolve(process.cwd(), 'temp_db_pull/.env')));
  if (clerkTestKeys.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = clerkTestKeys.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }
  if (clerkTestKeys.CLERK_SECRET_KEY) {
    process.env.CLERK_SECRET_KEY = clerkTestKeys.CLERK_SECRET_KEY;
  }
}

export default defineConfig({
  testMatch: 'src/tests/e2e/**/*.spec.ts',
  testIgnore: '**/*.test.ts',
  timeout: 60000,
  retries: 0,
  use: {
    launchOptions: {
      args: ['--no-proxy-server']
    },
    trace: 'on',
    baseURL: 'http://localhost:3008',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--proxy-server="direct://"', '--proxy-bypass-list=*', '--use-fake-ui-for-media-stream']
        }
      },
    },
  ],
  // Use externally running server on 3008
});
