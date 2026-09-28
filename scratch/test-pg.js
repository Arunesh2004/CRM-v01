const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const dbUrl = fs.readFileSync('.staging-db-url.txt', 'utf8').trim();
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } // Required for Supabase
  });
  
  try {
    await client.connect();
    const res = await client.query('SELECT current_user, session_user');
    console.log(res.rows);
    await client.end();
  } catch (e) {
    console.error('PG ERROR:', e.message);
  }
}

run();
