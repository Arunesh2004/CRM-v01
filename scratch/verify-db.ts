import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

async function verify() {
  console.log('Connecting using DIRECT_URL:', process.env.DIRECT_URL);
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();
  const res = await client.query('SELECT migration_name, started_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;');
  console.log('Migration History:', res.rows);
  await client.end();
}

verify().catch(console.error);
