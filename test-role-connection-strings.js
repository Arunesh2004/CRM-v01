const { Client } = require("pg");

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = "5432";
const database = "postgres";
const appPassword = process.env.CRM_STAGING_APP_PASSWORD;
const systemPassword = process.env.CRM_STAGING_SYSTEM_PASSWORD;

async function testConnection(poolerUsername, expectedDbUser, password, isSystem = false) {
  const encodedUser = encodeURIComponent(poolerUsername);
  const encodedPassword = encodeURIComponent(password);
  
  // Note: purposefully omitting ?sslmode=require here so the explicit pg ssl config applies properly
  const connectionString = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const result = await client.query("SELECT current_user, session_user;");
    const { current_user, session_user } = result.rows[0];

    const pass = current_user === expectedDbUser && session_user === expectedDbUser;
    
    let rolsuper = undefined;
    let rolbypassrls = undefined;
    
    if (isSystem) {
      const rolesResult = await client.query("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;");
      if (rolesResult.rows.length > 0) {
        rolsuper = rolesResult.rows[0].rolsuper;
        rolbypassrls = rolesResult.rows[0].rolbypassrls;
      }
    }

    return {
      success: true,
      current_user,
      session_user,
      rolsuper,
      rolbypassrls,
      pass
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  console.log("APP CONNECTION:");
  console.log("- host:", host);
  console.log("- port:", port);
  console.log("- database:", database);
  console.log("- pooler username:", "crm_app_user.tnlrlinitgfolvqgyd");

  const appResult = await testConnection("crm_app_user.tnlrlinitgfolvqgyd", "crm_app_user", appPassword, false);
  console.log("- connection successful:", appResult.success);
  if (appResult.success) {
    console.log("- current_user:", appResult.current_user);
    console.log("- session_user:", appResult.session_user);
    console.log("- role match pass:", appResult.pass);
  } else {
    console.log("- error:", appResult.error);
  }

  console.log("\nSYSTEM CONNECTION:");
  console.log("- host:", host);
  console.log("- port:", port);
  console.log("- database:", database);
  console.log("- pooler username:", "crm_system_user.tnlrlinitgfolvqgyd");

  const sysResult = await testConnection("crm_system_user.tnlrlinitgfolvqgyd", "crm_system_user", systemPassword, true);
  console.log("- connection successful:", sysResult.success);
  if (sysResult.success) {
    console.log("- current_user:", sysResult.current_user);
    console.log("- session_user:", sysResult.session_user);
    console.log("- rolsuper:", sysResult.rolsuper);
    console.log("- rolbypassrls:", sysResult.rolbypassrls);
    console.log("- role match pass:", sysResult.pass);
  } else {
    console.log("- error:", sysResult.error);
  }
}

main().catch(err => {
  console.error("Fatal Error:", err.message);
  process.exitCode = 1;
});
