const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT id, name, phone, village FROM customers WHERE village IS NOT NULL AND village != '' LIMIT 10`);
    console.log('Customers with village data:');
    console.table(rows);

    const { rows: countResult } = await client.query(`SELECT COUNT(*) as count FROM customers WHERE village IS NOT NULL AND village != ''`);
    console.log(`\nTotal customers with village data: ${countResult.rows[0].count}`);

    const { rows: totalCount } = await client.query(`SELECT COUNT(*) as count FROM customers`);
    console.log(`Total customers: ${totalCount.rows[0].count}`);

  } finally {
    client.release();
    await pool.end();
  }
})().catch(console.error);