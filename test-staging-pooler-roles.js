const { Client } = require("pg");

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = "5432";
const database = "postgres";
const appPassword = process.env.CRM_STAGING_APP_PASSWORD;
const systemPassword = process.env.CRM_STAGING_SYSTEM_PASSWORD;

async function testConnection(roleName, poolerUsername, password) {
  console.log(`\nTESTING ROLE: ${roleName}`);
  console.log("- host:", host);
  console.log("- port:", port);
  console.log("- database:", database);
  console.log("- username:", poolerUsername);
  
  if (!password) {
    console.log("- error: Password environment variable not found.");
    return;
  }

  const encodedUser = encodeURIComponent(poolerUsername);
  const encodedPassword = encodeURIComponent(password);
  
  const connectionString = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const result = await client.query("SELECT current_user, session_user;");
    const { current_user, session_user } = result.rows[0];

    console.log("- connection successful: true");
    console.log("- current_user:", current_user);
    console.log("- session_user:", session_user);
  } catch (error) {
    console.log("- connection successful: false");
    console.log("- sanitized error:", error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  await testConnection("crm_app_user", "crm_app_user.tnlrlinitgfolgwvqgyd", appPassword);
  await testConnection("crm_system_user", "crm_system_user.tnlrlinitgfolgwvqgyd", systemPassword);
}

main().catch(err => {
  console.error("- Fatal Error:", err.message);
  process.exitCode = 1;
});
