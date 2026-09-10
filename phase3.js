const { Client } = require('pg');
const fs = require('fs');
async function main() {
  const c = new Client({connectionString: 'postgresql://postgres.ughcghzhmsruhalngrxp:Asifitsyourlast.6@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'});
  await c.connect();
  const res = await c.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position");
  fs.writeFileSync('docs/forensics/S3.8_PRODUCTION_BEFORE.txt', JSON.stringify(res.rows, null, 2));
  await c.end();
}
main();
