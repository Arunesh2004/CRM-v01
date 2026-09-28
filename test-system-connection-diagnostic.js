const { Client } = require('pg');

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = process.env.CRM_STAGING_PORT || "5432";
const database = process.env.CRM_STAGING_DATABASE || "postgres";

const sysUsername = "crm_system_user.tnlrlinitgfolgwvqgyd";
const sysPassword = process.env.CRM_STAGING_SYSTEM_PASSWORD;

async function main() {
  console.log("--- SYSTEM CONNECTION DIAGNOSTIC ---");
  console.log("- host:", host);
  console.log("- port:", port);
  console.log("- database:", database);
  console.log("- username:", sysUsername);
  console.log("- password present:", !!sysPassword);

  if (!sysPassword) {
    console.error("ERROR: Missing CRM_STAGING_SYSTEM_PASSWORD in environment.");
    process.exit(1);
  }

  const encodedSysUser = encodeURIComponent(sysUsername);
  const encodedSysPassword = encodeURIComponent(sysPassword);
  
  // Use the direct pg connection string, identical to what Prisma is using minus the sslmode=require (since we pass ssl object)
  const databaseUrlForPg = `postgresql://${encodedSysUser}:${encodedSysPassword}@${host}:${port}/${database}`;

  const client = new Client({
    connectionString: databaseUrlForPg,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("- connection: SUCCESS");

    const res = await client.query('SELECT current_user, session_user;');
    console.log("- current_user:", res.rows[0].current_user);
    console.log("- session_user:", res.rows[0].session_user);

  } catch (err) {
    console.log("- connection: FAILED");
    
    // Safely sanitize the error message to ensure no credential leakage
    let sanitizedMsg = err.message;
    if (sysPassword) {
      sanitizedMsg = sanitizedMsg.split(sysPassword).join('[REDACTED_SYSTEM_PASSWORD]')
                                 .split(encodedSysPassword).join('[REDACTED_SYSTEM_PASSWORD]');
    }
    console.log("- sanitized error:", sanitizedMsg);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
