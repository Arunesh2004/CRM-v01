const { Client } = require('pg');
async function main() {
  const c = new Client({connectionString: 'postgresql://postgres.ughcghzhmsruhalngrxp:Asifitsyourlast.6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'});
  await c.connect();
  const triggers = await c.query("SELECT tgname FROM pg_trigger JOIN pg_class ON tgrelid = pg_class.oid JOIN pg_namespace ON relnamespace = pg_namespace.oid WHERE nspname = 'public' AND relname = 'AuditLog'");
  console.log('AuditLog triggers:', triggers.rows.map(r=>r.tgname));
  await c.end();
}
main();
