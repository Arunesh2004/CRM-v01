import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

// Load .env.test specifically and override any existing ENV variables
const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath, override: true });

async function setupRoles() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'crm_app_user') THEN
        CREATE ROLE crm_app_user WITH LOGIN PASSWORD 'app_password';
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'crm_system_user') THEN
        CREATE ROLE crm_system_user WITH LOGIN PASSWORD 'system_password';
      END IF;
    END
    $$;
    ALTER ROLE crm_system_user WITH BYPASSRLS;
    GRANT ALL PRIVILEGES ON DATABASE e2e_db TO crm_app_user;
    GRANT ALL PRIVILEGES ON DATABASE e2e_db TO crm_system_user;
    GRANT ALL PRIVILEGES ON SCHEMA public TO crm_app_user;
    GRANT ALL PRIVILEGES ON SCHEMA public TO crm_system_user;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_app_user;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO crm_system_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_app_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO crm_system_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO crm_system_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO crm_system_user;
  `);
  await client.end();
}

async function main() {
  console.log('Setting up E2E database roles...');
  await setupRoles();

  console.log('Running canonical E2E migrations using .env.test...');
  try {
    // Execute prisma migrate deploy with the injected environment variables
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log('E2E migration complete.');
  } catch (error) {
    console.error('Failed to apply E2E migrations:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Failed to apply E2E migrations:', error);
  process.exit(1);
});
