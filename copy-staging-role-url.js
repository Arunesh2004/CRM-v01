const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const target = args[0];

if (target !== 'app' && target !== 'system') {
  console.error("Usage: node .\\copy-staging-role-url.js <app|system>");
  process.exit(1);
}

const host = "aws-0-ap-northeast-2.pooler.supabase.com";
const port = "5432";
const database = "postgres";
const appPassword = process.env.CRM_STAGING_APP_PASSWORD;
const systemPassword = process.env.CRM_STAGING_SYSTEM_PASSWORD;

let url = "";
let username = "";
let password = "";

if (target === 'app') {
  username = "crm_app_user.tnlrlinitgfolgwvqgyd";
  password = appPassword;
} else if (target === 'system') {
  username = "crm_system_user.tnlrlinitgfolgwvqgyd";
  password = systemPassword;
}

const label = target === 'app' ? "DATABASE_URL (APP)" : "ADMIN_DATABASE_URL (SYSTEM)";

console.log(`${label} METADATA`);
console.log("- host:", host);
console.log("- port:", port);
console.log("- database:", database);
console.log("- username:", username);

if (!password) {
  console.log("- password present: false");
  console.log("- URL constructed: false");
  console.error(`\nError: Missing environment variable for ${target} password.`);
  process.exit(1);
}

console.log("- password present: true");

const encodedUser = encodeURIComponent(username);
const encodedPassword = encodeURIComponent(password);
url = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}?sslmode=require`;

console.log("- URL constructed: true");

const result = spawnSync('powershell', ['-NoProfile', '-Command', '$input | Set-Clipboard'], {
  input: url,
  encoding: 'utf-8'
});

if (result.status !== 0) {
  console.error("\nFailed to copy to clipboard.");
  process.exit(1);
}

console.log(`\n${label} copied securely to the Windows clipboard.`);
