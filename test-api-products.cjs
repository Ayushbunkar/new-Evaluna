const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testProductsAPI() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Check products API response
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
      LIMIT 5
    `);

    console.log('Products API Response (first 5 products):');
    console.table(result.rows);

    console.log(`\nTotal products: ${result.rows.length}`);

    // Check if any have meaningful data beyond basics
    const withProcurementPrice = result.rows.filter(p => p.base_procurement_price !== null);
    console.log(`Products with base procurement price: ${withProcurementPrice.length}`);

    if (withProcurementPrice.length > 0) {
      console.log('\nSample products with procurement data:');
      console.table(withProcurementPrice.slice(0, 3));
    }

    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProductsAPI();