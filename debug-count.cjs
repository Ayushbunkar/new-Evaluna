const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT COUNT(*) as cnt FROM customers WHERE village IS NOT NULL AND village != ''`);
    console.log('Query result:', res);
    console.log('Rows:', res.rows);
    console.log('Row count:', res.rows.length);
    if (res.rows.length) {
      console.log('Count:', res.rows[0].cnt);
    }
  } finally {
    client.release();
    await pool.end();
  }
})().catch(console.error);