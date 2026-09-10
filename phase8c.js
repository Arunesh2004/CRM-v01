const { Client } = require('pg');
async function main() {
  const c = new Client({connectionString: 'postgresql://postgres.ughcghzhmsruhalngrxp:Asifitsyourlast.6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'});
  await c.connect();
  const res = await c.query("SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'UserInvitation'");
  console.log('TABLE:', res.rows[0]);
  const pols = await c.query("SELECT polname, polcmd, (SELECT rolname FROM pg_roles WHERE oid = ANY(polroles)) as roles, pg_get_expr(polqual, polrelid) as using_expr, pg_get_expr(polwithcheck, polrelid) as with_check_expr FROM pg_policy WHERE polrelid = 'public.\"UserInvitation\"'::regclass");
  console.log('POLICIES:', pols.rows);
  await c.end();
}
main();
