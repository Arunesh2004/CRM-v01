const { spawnSync } = require('child_process');
const { Client } = require('pg');
const { URL } = require('url');

require('dotenv').config({ path: '.env.staging.local' });
require('dotenv').config({ path: '.env.staging' });
require('dotenv').config();

const directUrlString = process.env.DIRECT_URL;

if (!directUrlString) {
  console.error("ERROR: Missing DIRECT_URL in environment.");
  process.exit(1);
}

const parsedUrl = new URL(directUrlString);

async function main() {
  console.log("--- OWNER-ROLE CONNECTION DIAGNOSTIC ---");
  console.log("- Host:", parsedUrl.hostname);
  console.log("- Username:", parsedUrl.username);

  const client = new Client({
    connectionString: directUrlString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const idRes = await client.query("SELECT current_user, session_user;");
    const { current_user, session_user } = idRes.rows[0];
    
    console.log("- current_user:", current_user);
    console.log("- session_user:", session_user);
    
    if (current_user !== 'postgres' || session_user !== 'postgres') {
      console.error("ERROR: Connection identity is not postgres. Halting.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  const envOverrides = {
    ...process.env,
    DATABASE_URL: directUrlString,
    DIRECT_URL: directUrlString
  };

  console.log("\n--- EXECUTING MIGRATION DEPLOY ---");
  console.log("Executing: npx prisma migrate deploy...");
  
  const deployResult = spawnSync('npx.cmd', ['prisma', 'migrate', 'deploy'], {
    env: envOverrides,
    encoding: 'utf-8',
    stdio: 'inherit',
    shell: true
  });

  if (deployResult.status !== 0 || deployResult.error) {
    console.error("\nMigration deployment failed. Halting.");
    process.exit(1);
  }

  console.log("\nMigration deployment completed successfully.");
}

main().catch(console.error);
