const { Client } = require('pg');
async function main() {
  const c = new Client({connectionString: 'postgresql://postgres.ughcghzhmsruhalngrxp:Asifitsyourlast.6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'});
  await c.connect();
  const res = await c.query("SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'UserInvitation'");
  console.log(res.rows[0]);
  const pols = await c.query("SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as polqual, pg_get_expr(polwithcheck, polrelid) as polwithcheck FROM pg_policy WHERE polrelid = 'public.\"UserInvitation\"'::regclass");
  console.log(pols.rows);
  await c.end();
}
main();
