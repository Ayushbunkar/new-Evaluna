const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testAPIResponse() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Simulate what the TRPC customers.list query does
    const result = await client.query(`
      SELECT
        id,
        customer_code,
        name,
        email,
        phone,
        address,
        village,
        status,
        user_uid,
        store_credit,
        loyalty_tier,
        loyalty_points,
        tier_override,
        marketing_opt_in,
        created_at
      FROM customers
      WHERE (is_deleted = false OR is_deleted IS NULL)
    `);

    console.log('API Response Data (first 5 customers):');
    console.table(result.rows.slice(0, 5));

    console.log(`\nTotal customers returned: ${result.rows.length}`);

    // Check if any have village data
    const withVillage = result.rows.filter(c => c.village !== null && c.village !== '');
    console.log(`Customers with village data: ${withVillage.length}`);

    if (withVillage.length > 0) {
      console.log('\nSample customers with village data:');
      console.table(withVillage.slice(0, 3));
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPIResponse();