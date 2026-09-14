import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:app_password@localhost:5435/postgres'
  });
  
  await client.connect();
  
  try {
    await client.query('DROP DATABASE IF EXISTS e2e_db_a');
    await client.query('CREATE DATABASE e2e_db_a');
    console.log('Created e2e_db_a');
  } catch (e) {
    console.log('DB A exists or error:', e.message);
  }

  try {
    await client.query('DROP DATABASE IF EXISTS e2e_db_b');
    await client.query('CREATE DATABASE e2e_db_b');
    console.log('Created e2e_db_b');
  } catch (e) {
    console.log('DB B exists or error:', e.message);
  }
  
  await client.end();
}

main().catch(console.error);
