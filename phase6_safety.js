const { Client } = require('pg');
async function main() {
  const c = new Client({connectionString: 'postgresql://postgres.ughcghzhmsruhalngrxp:Asifitsyourlast.6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'});
  await c.connect();
  const res1 = await c.query("SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN ('crm_app_user', 'crm_system_user')");
  console.log('Roles:', res1.rows);
  const res2 = await c.query("SELECT relname FROM pg_class WHERE relname IN ('Subscription', 'Invoice')");
  console.log('Legacy Billing Tables:', res2.rows);
  const res3 = await c.query("SELECT tgname FROM pg_trigger WHERE tgname = 'prevent_audit_log_modification'");
  console.log('AuditLog Trigger:', res3.rows);
  await c.end();
}
main();
