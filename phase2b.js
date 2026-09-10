const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const c = new Client({connectionString: 'postgresql://postgres.ughcghzhmsruhalngrxp:Asifitsyourlast.6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'});
  await c.connect();
  const tables = await c.query("SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND relkind = 'r'");
  const pols = await c.query("SELECT polrelid::regclass as relname, polname, polcmd, polpermissive, pg_get_expr(polqual, polrelid) as polqual, pg_get_expr(polwithcheck, polrelid) as polwithcheck FROM pg_policy p JOIN pg_class c ON p.polrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public'");
  
  fs.writeFileSync('docs/forensics/S3.8B_PRODUCTION_RLS_FULL.json', JSON.stringify({tables: tables.rows, policies: pols.rows}, null, 2));
  await c.end();
}
main();
