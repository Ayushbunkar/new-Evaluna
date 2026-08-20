const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testProducts() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Check if products table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'products'
      );
    `);
    console.log(`Products table exists: ${tableCheck.rows[0].exists}`);

    // Count existing products
    const countResult = await client.query('SELECT COUNT(*) as count FROM products');
    console.log(`Existing products: ${countResult.rows[0].count}`);

    // Show sample products if any exist
    if (parseInt(countResult.rows[0].count) > 0) {
      const sampleResult = await client.query('SELECT id, name, sku, price, barcode FROM products LIMIT 5');
      console.log('Sample products:');
      console.table(sampleResult.rows);
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProducts();