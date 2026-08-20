const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

function cleanPrice(priceStr) {
  if (!priceStr) return 0;
  // Remove currency symbols, commas, spaces
  let cleaned = priceStr.toString().replace(/[₹,\s]/g, '');
  // If empty after cleaning, return 0
  if (cleaned === '' || cleaned === null) return 0;
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function importProducts() {
  const fs = require('fs');
  const csvContent = fs.readFileSync('EVALUNA PVT LTD - Product_Master.csv', 'utf8');
  const lines = csvContent.split('\n');
  const results = [];

  // Parse CSV manually (assuming first line is header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    // Split by comma, but we only need first three columns
    const parts = line.split(',');
    if (parts.length >= 3) {
      const name = parts[0].trim();
      const procurement = parts[1].trim();
      const selling = parts[2].trim();

      // Skip if name empty
      if (!name) continue;

      results.push({
        name,
        procurement_price: cleanPrice(procurement),
        selling_price: cleanPrice(selling)
      });
    }
  }

  console.log(`Parsed ${results.length} product entries from CSV`);

  const client = await pool.connect();
  try {
    // Get existing product names to avoid duplicates
    const { rows: existingProducts } = await client.query(
      `SELECT name FROM products WHERE name IS NOT NULL`
    );
    const existingNames = new Set(existingProducts.map(p => p.name));
    console.log(`Found ${existingNames.size} existing products`);

    // Filter out duplicates
    const newProducts = results.filter(p => !existingNames.has(p.name));
    const duplicateCount = results.length - newProducts.length;

    console.log(`New products to import: ${newProducts.length}`);
    console.log(`Duplicates skipped: ${duplicateCount}`);

    if (newProducts.length === 0) {
      console.log("No new products to import!");
      return;
    }

    // Get or create staff user for user_uid
    let staffId = 1;
    const { rows: staff } = await client.query('SELECT id FROM staff LIMIT 1');
    if (staff.length > 0) {
      staffId = staff[0].id;
    } else {
      // Create default staff if none exists
      const { rows: newStaff } = await client.query(`
        INSERT INTO staff (name, email, phone, role, branch_id, status)
        VALUES ('System Administrator', 'admin@evaluna.com', '+919999999999', 'admin', 1, 'active')
        RETURNING id
      `);
      staffId = newStaff[0].id;
    }
    console.log(`Using staff ID: ${staffId}`);

    // Import products in batches
    const batchSize = 50;
    let importedCount = 0;

    for (let i = 0; i < newProducts.length; i += batchSize) {
      const batch = newProducts.slice(i, i + batchSize);

      // Build parameterized query
      const params = [];
      const valuePlaceholders = [];

      for (let j = 0; j < batch.length; j++) {
        const product = batch[j];
        const paramIndex = j * 15 + 1; // 15 columns we will set
        valuePlaceholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8}, $${paramIndex+9}, $${paramIndex+10}, $${paramIndex+11}, $${paramIndex+12}, $${paramIndex+13}, $${paramIndex+14})`);
        params.push(
          product.name,
          null, // description
          product.procurement_price, // base_procurement_price
          product.selling_price, // base_selling_price
          product.selling_price, // price (legacy) - use selling price
          staffId, // user_uid
          null, // category
          null, // hsn
          true, // taxable
          null, // barcode
          null, // sku
          null, // unit
          null, // product_family
          null, // variant_name
          false, // is_pack
          null, // loose_product_id
          null, // units_per_pack
          false, // is_weighted
          false, // is_reward_item
          'global', // visibility_level
          false, // is_hidden
          new Date(), // created_at
          new Date(), // updated_at
          null, // deleted_at
          false // is_deleted
        );
      }

      const query = `
        INSERT INTO products
        (name, description, base_procurement_price, base_selling_price, price, user_uid, category, hsn, taxable, barcode, sku, unit, product_family, variant_name, is_pack, loose_product_id, units_per_pack, is_weighted, is_reward_item, visibility_level, is_hidden, created_at, updated_at, deleted_at, is_deleted)
        VALUES ${valuePlaceholders.join(',')}
      `;

      await client.query(query, params);
      importedCount += batch.length;
      console.log(`Imported batch ${Math.floor(i / batchSize) + 1} (${importedCount}/${newProducts.length} total)`);
    }

    console.log(`✅ Product import completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total CSV entries: ${results.length}`);
    console.log(`   - New products imported: ${importedCount}`);
    console.log(`   - Duplicates skipped: ${duplicateCount}`);

  } catch (error) {
    console.error('❌ Error importing products:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importProducts().catch(console.error);