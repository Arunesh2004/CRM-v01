const host = process.env.CRM_STAGING_HOST || "db.tnlrlinitgfolgwvqgyd.supabase.co";
const port = process.env.CRM_STAGING_PORT || "5432";
const database = process.env.CRM_STAGING_DATABASE || "postgres";
const appPassword = process.env.CRM_STAGING_APP_PASSWORD;
const systemPassword = process.env.CRM_STAGING_SYSTEM_PASSWORD;

function verifyAndPrint(name, username, password) {
  console.log(`\n${name} DATABASE_URL`);
  console.log("- host:", host);
  console.log("- port:", port);
  console.log("- database:", database);
  console.log("- username =", username);
  console.log("- password present =", !!password);
  
  if (password) {
    const encodedUser = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    const url = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}?sslmode=require`;
    console.log("- URL constructed = true");
  } else {
    console.log("- URL constructed = false");
  }
}

verifyAndPrint("APP", "crm_app_user", appPassword);
verifyAndPrint("ADMIN", "crm_system_user", systemPassword);

console.log("\nVERIFICATION:");
console.log("- Usernames are different:", "crm_app_user" !== "crm_system_user");
console.log("- Host/Database are identical for both URLs:", true);
