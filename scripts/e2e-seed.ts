import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.test explicitly
const envPath = path.resolve(process.cwd(), '.env.test');
const parsed = dotenv.config({ path: envPath }).parsed;

if (!parsed) {
  console.error('Failed to parse .env.test');
  process.exit(1);
}

console.log('Running E2E seed using DIRECT_URL (bypassing RLS)...');

try {
  // Execute the seed script using DIRECT_URL to bypass RLS for bootstrapping
  execSync('npx tsx prisma/seed-e2e.ts', {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...parsed,
      DATABASE_URL: parsed.DIRECT_URL
    }
  });
  console.log('E2E seed complete.');
} catch (error) {
  console.error('Failed to run E2E seed:', error);
  process.exit(1);
}
