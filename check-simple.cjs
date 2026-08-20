const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT id, name, village FROM customers LIMIT 5');
    console.log('First 5 customers:');
    console.table(rows);
  } finally {
    client.release();
    await pool.end();
  }
})().catch(console.error);