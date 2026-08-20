const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function importCustomers() {
  // Read and parse CSV manually (no external dependencies)
  const fs = require('fs');
  const csvContent = fs.readFileSync('Contacts.csv', 'utf8');
  const lines = csvContent.split('\n');
  const results = [];

  // Parse CSV manually
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;

    const values = lines[i].split(',');
    if (values.length >= 3) {
      results.push({
        name: values[0].trim(),
        phone: values[1].trim(),
        village: values[2].trim(),
      });
    }
  }

  console.log(`Parsed ${results.length} contacts from CSV`);

  // Clean phone numbers and prepare data
  const customersToProcess = results.map(customer => {
    // Clean phone number: remove spaces, slashes, and non-digits except leading +
    let cleanPhone = customer.phone.replace(/[\s\/]/g, '');
    // Keep only digits and + at start
    cleanPhone = cleanPhone.replace(/[^\d+]/g, '');
    // If it starts with 0 and is 10 digits, assume it's an Indian mobile and keep as-is
    // Otherwise, just use what we have

    return {
      name: customer.name,
      phone: cleanPhone,
      village: customer.village
    };
  }).filter(c => c.phone && c.phone.length >= 10); // Basic validation

  console.log(`After cleaning and validation: ${customersToProcess.length} customers`);

  const client = await pool.connect();
  try {
    // Check existing customers to avoid duplicates by phone
    const { rows: existingCustomers } = await client.query(
      `SELECT phone FROM customers WHERE phone IS NOT NULL`
    );
    const existingPhones = new Set(existingCustomers.map(c => c.phone));
    console.log(`Found ${existingPhones.size} existing customers with phone numbers`);

    // Filter out duplicates
    const newCustomers = customersToProcess.filter(c => !existingPhones.has(c.phone));
    const duplicateCount = customersToProcess.length - newCustomers.length;

    console.log(`New customers to import: ${newCustomers.length}`);
    console.log(`Duplicates skipped: ${duplicateCount}`);

    if (newCustomers.length === 0) {
      console.log("No new customers to import!");
      return;
    }

    // Get or create the main branch
    let branchId = 1;
    const { rows: branches } = await client.query('SELECT id FROM branches LIMIT 1');
    if (branches.length > 0) {
      branchId = branches[0].id;
    } else {
      // Create main branch if none exists
      const { rows: newBranch } = await client.query(`
        INSERT INTO branches (name, code, address, is_headquarters)
        VALUES ('Main Warehouse', 'MAIN', 'Central Location', true)
        RETURNING id
      `);
      branchId = newBranch[0].id;
    }
    console.log(`Using branch ID: ${branchId}`);

    // Get or create staff user for user_uid
    let staffId = 1;
    const { rows: staff } = await client.query('SELECT id FROM staff LIMIT 1');
    if (staff.length > 0) {
      staffId = staff[0].id;
    } else {
      // Create default staff if none exists
      const { rows: newStaff } = await client.query(`
        INSERT INTO staff (name, email, phone, role, branch_id, status)
        VALUES ('System Administrator', 'admin@evaluna.com', '+919999999999', 'admin', $1, 'active')
        RETURNING id
      `, [branchId]);
      staffId = newStaff[0].id;
    }
    console.log(`Using staff ID: ${staffId}`);

    // Import customers in batches
    const batchSize = 50;
    let importedCount = 0;

    for (let i = 0; i < newCustomers.length; i += batchSize) {
      const batch = newCustomers.slice(i, i + batchSize);

      // Build parameterized query
      const params = [];
      const valuePlaceholders = [];

      for (let j = 0; j < batch.length; j++) {
        const customer = batch[j];
        const paramIndex = j * 15 + 1; // 15 columns being inserted
        valuePlaceholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7}, $${paramIndex+8}, $${paramIndex+9}, $${paramIndex+10}, $${paramIndex+11}, $${paramIndex+12}, $${paramIndex+13}, $${paramIndex+14})`);
        params.push(
          branchId,
          // Generate customer code based on name or use a sequence
          `CUST-${String(100000 + importedCount + j).slice(-6)}`, // CUST-100000, CUST-100001, etc.
          customer.name,
          // Generate email from name (optional field)
          customer.name.toLowerCase().replace(/[^a-z0-9]+/g, '.') + '@evaluna.local' || null,
          customer.phone,
          customer.village,
          null, // latitude
          null, // longitude
          staffId,
          'active', // status
          null, // gst_number
          null, // pan_number
          '0.00', // credit_limit
          '0.00', // credit_used
          false, // credit_hold
          '0.00', // store_credit
          30, // payment_terms
          'retail', // customer_type
          'bronze', // loyalty_tier
          0, // loyalty_points
          false, // tier_override
          true, // marketing_opt_in
          new Date(), // created_at
          new Date()  // updated_at
        );
      }

      const query = `
        INSERT INTO customers
        (branch_id, customer_code, name, email, phone, village, latitude, longitude, user_uid, status,
         gst_number, pan_number, credit_limit, credit_used, credit_hold, store_credit, payment_terms,
         customer_type, loyalty_tier, loyalty_points, tier_override, marketing_opt_in, created_at, updated_at)
        VALUES ${valuePlaceholders.join(',')}
        ON CONFLICT (phone) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          village = EXCLUDED.village,
          user_uid = EXCLUDED.user_uid,
          updated_at = NOW()
      `;

      await client.query(query, params);
      importedCount += batch.length;
      console.log(`Imported batch ${Math.floor(i / batchSize) + 1} (${importedCount}/${newCustomers.length} total)`);
    }

    console.log(`✅ Customer import completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total CSV records: ${results.length}`);
    console.log(`   - After validation: ${customersToProcess.length}`);
    console.log(`   - New customers imported: ${importedCount}`);
    console.log(`   - Duplicates skipped: ${duplicateCount}`);

  } catch (error) {
    console.error('❌ Error importing customers:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importCustomers().catch(console.error);