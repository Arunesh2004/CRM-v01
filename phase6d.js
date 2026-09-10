const { Client } = require('pg');
async function main() {
  const c = new Client({connectionString: 'postgresql://postgres.ughcghzhmsruhalngrxp:Asifitsyourlast.6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'});
  await c.connect();
  const res1 = await c.query("SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname LIKE '%crm%'");
  console.log('Roles:', res1.rows);
  await c.end();
}
main();
