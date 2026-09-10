const { Client } = require('pg');
const fs = require('fs');
async function main() {
  const c = new Client({connectionString: 'postgresql://postgres.ughcghzhmsruhalngrxp:Asifitsyourlast.6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'});
  await c.connect();
  const funcs = await c.query("SELECT proname FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE nspname = 'public'");
  console.log('Functions:', funcs.rows.map(r=>r.proname));
  const triggers = await c.query("SELECT tgname FROM pg_trigger JOIN pg_class ON tgrelid = pg_class.oid JOIN pg_namespace ON relnamespace = pg_namespace.oid WHERE nspname = 'public'");
  console.log('Triggers:', triggers.rows.map(r=>r.tgname));
  await c.end();
}
main();
