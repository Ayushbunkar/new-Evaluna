const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT email FROM customers LIMIT 5');
    console.log('Existing customer emails:');
    console.table(rows);

    // Also check if email can be null by looking at one record with null email
    const { rows: nullEmails } = await client.query('SELECT email FROM customers WHERE email IS NULL LIMIT 5');
    console.log(`\nCustomers with NULL email: ${nullEmails.length}`);

  } finally {
    client.release();
    await pool.end();
  }
})().catch(console.error);