const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  const client = await pool.connect();
  try {
    const { rows: countResult } = await client.query(`SELECT COUNT(*) as count FROM customers WHERE village IS NOT NULL AND village != ''`);
    console.log('countResult:', countResult);
    console.log('rows:', countResult.rows);
    if (countResult.rows.length) {
      console.log('count:', countResult.rows[0].count);
    }
  } finally {
    client.release();
    await pool.end();
  }
})().catch(console.error);
