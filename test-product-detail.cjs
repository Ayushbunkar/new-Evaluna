const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testProductDetail() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Check a product with all relevant fields
    const result = await client.query(`
      SELECT
        id,
        name,
        base_procurement_price,
        base_selling_price,
        price,
        hsn,
        taxable,
        barcode,
        sku,
        unit,
        category
      FROM products
      WHERE id = 33
    `);
    console.log('Product details (ID 33):');
    console.log(result.rows[0]);

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProductDetail();