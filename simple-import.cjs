// Simple CSV import script using Node.js built-in modules where possible
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function importCustomers() {
  const client = await pool.connect();

  try {
    console.log('Starting customer import from Contacts.csv...');

    // Read CSV file
    const data = fs.readFileSync('./Contacts.csv', 'utf8');
    const lines = data.trim().split('\n');

    // Skip header
    const customers = [];
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [name, phone, village] = line.split(',').map(field => field.trim());

      if (!name || !phone || !village) {
        skipped++;
        continue;
      }

      // Clean phone
      const cleanPhone = phone.replace(/\s+/g, '').replace(/\//g, '');

      // Generate customer code
      const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const customerCode = `${cleanName}_${Math.floor(Math.random() * 10000)}`;

      // Generate email
      const email = `${cleanName.toLowerCase()}@example.com`.replace(/[^a-zA-Z0-9@.]/g, '');

      customers.push({
        name,
        phone: cleanPhone.length <= 20 ? cleanPhone : cleanPhone.substring(0, 20),
        village,
        customer_code: customerCode,
        email: email || null
      });
    }

    console.log(`Processed ${customers.length} customers from CSV (skipped ${skipped})`);

    if (customers.length === 0) {
      console.log('No customers to import!');
      return;
    }

    // Get or create branch
    let branchId = 1;
    const branchResult = await client.query('SELECT id FROM branches LIMIT 1');
    if (branchResult.rows.length === 0) {
      const insertBranch = await client.query(`
        INSERT INTO branches (name, code, address, is_headquarters, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `, ['Main Warehouse', 'MAIN', 'Central Location', true]);
      branchId = insertBranch.rows[0].id;
      console.log(`Created branch with ID: ${branchId}`);
    } else {
      branchId = branchResult.rows[0].id;
      console.log(`Using existing branch with ID: ${branchId}`);
    }

    // Get or create staff
    let staffId = 1;
    const staffResult = await client.query('SELECT id FROM staff LIMIT 1');
    if (staffResult.rows.length === 0) {
      const insertStaff = await client.query(`
        INSERT INTO staff (branch_id, staff_code, name, email, phone, role, join_date, salary, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id
      `, [branchId, 'ADMIN001', 'System Administrator', 'admin@evaluna.com', '+91 9999999999', 'admin', '2023-01-01', '50000', 'active']);
      staffId = insertStaff.rows[0].id;
      console.log(`Created staff with ID: ${staffId}`);
    } else {
      staffId = staffResult.rows[0].id;
      console.log(`Using existing staff with ID: ${staffId}`);
    }

    // Insert customers
    const values = customers.map(c => `
      (${branchId}, '${c.customer_code.replace(/'/g, "''")}', '${c.name.replace(/'/g, "''")}',
       ${c.email ? `'${c.email.replace(/'/g, "''")}'` : 'NULL'},
       '${c.phone || ''}', '${c.village.replace(/'/g, "''")}, India', '${c.village}',
       NULL, NULL, 'admin', 'active', NULL, NULL, 0.00, 0.00, false, 0.00,
       30, 'retail', 'bronze', 0, false, 0.00, 0.00, true, NOW(), NOW(), NULL, false)
    `).join(',');

    const query = `
      INSERT INTO customers (
        branch_id, customer_code, name, email, phone, address, village,
        latitude, longitude, user_uid, status, gst_number, pan_number,
        credit_limit, credit_used, credit_hold, store_credit, payment_terms,
        customer_type, loyalty_tier, loyalty_points, tier_override,
        total_spent, lifetime_value, marketing_opt_in, created_at, updated_at,
        deleted_at, is_deleted
      )
      VALUES ${values}
      ON CONFLICT (customer_code) DO NOTHING
      RETURNING id, name, phone, village
    `;

    const result = await client.query(query);
    console.log(`✅ Successfully imported ${result.rowCount} customers`);

    // Show sample
    console.log('\nSample of imported customers:');
    result.rows.slice(0, Math.min(5, result.rows.length)).forEach((row, index) => {
      console.log(`${index + 1}. ${row.name} | ${row.phone} | ${row.village}`);
    });

  } catch (error) {
    console.error('❌ Error importing customers:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importCustomers();