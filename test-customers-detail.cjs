const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testCustomers() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Check customer records with village data
    const result = await client.query('SELECT id, name, phone, village FROM customers LIMIT 10');
    console.log('Customer records with village data:');
    console.table(result.rows);

    // Count customers with village data
    const villageCount = await client.query("SELECT COUNT(*) as count FROM customers WHERE village IS NOT NULL AND village != ''");
    console.log(`Customers with village data: ${villageCount.rows[0].count}`);

    // Count total customers
    const totalCount = await client.query('SELECT COUNT(*) as count FROM customers');
    console.log(`Total customers: ${totalCount.rows[0].count}`);

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCustomers();