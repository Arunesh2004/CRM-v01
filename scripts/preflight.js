const { Client } = require('pg');

async function run() {
  try {
    const dbUrl = process.env.DB_URL;
    if (!dbUrl) {
      console.error('DB_URL not set in env');
      process.exit(1);
    }

    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();

    console.log('--- 1. VERIFY CURRENT PRODUCTION TARGET ---');
    let res = await client.query('SELECT current_database();');
    console.log('Current DB:', res.rows[0].current_database);
    res = await client.query('SELECT current_schema();');
    console.log('Current Schema:', res.rows[0].current_schema);

    console.log('\n--- 2. VERIFY EXISTING COLUMNS ---');
    res = await client.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN ('ChatMessage','MailMessage')
      AND column_name IN ('referenceType','referenceId')
      ORDER BY table_name, column_name;
    `);
    console.log(res.rows);

    console.log('\n--- 3. VERIFY EXISTING TABLES / ROW COUNTS ---');
    res = await client.query('SELECT COUNT(*) FROM "ChatMessage";');
    console.log('ChatMessage Count:', res.rows[0].count);
    res = await client.query('SELECT COUNT(*) FROM "MailMessage";');
    console.log('MailMessage Count:', res.rows[0].count);

    console.log('\n--- 4. VERIFY RLS ---');
    res = await client.query(`
      SELECT
        c.relname,
        c.relrowsecurity,
        c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname IN ('ChatMessage','MailMessage');
    `);
    console.log(res.rows);

    console.log('\n--- 5. VERIFY MIGRATION HISTORY ---');
    res = await client.query(`
      SELECT
        migration_name,
        finished_at,
        rolled_back_at
      FROM "_prisma_migrations"
      ORDER BY finished_at;
    `);
    res.rows.forEach(r => {
      console.log(`${r.migration_name} - Finished: ${!!r.finished_at} - Rolled Back: ${!!r.rolled_back_at}`);
    });

    await client.end();
  } catch (err) {
    console.error(err.message);
  }
}

run();
