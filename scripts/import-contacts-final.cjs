const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

// Function to clean and extract the first phone number
function cleanPhoneNumber(phone) {
  // Remove any whitespace
  let cleaned = phone.trim();
  // If there are multiple numbers separated by /, take the first one
  if (cleaned.includes('/')) {
    cleaned = cleaned.split('/')[0].trim();
  }
  // Remove any non-digit characters except + (for country codes)
  cleaned = cleaned.replace(/[^\d+]/g, '');
  return cleaned;
}

// Database connection configuration using DATABASE_URL from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function importContacts() {
  // Read and parse CSV manually (no external dependencies)
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
        phone: cleanPhoneNumber(values[1]),
        village: values[2].trim(),
        customer_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        user_uid: 'system',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  console.log(`Parsed ${results.length} contacts`);

  const client = await pool.connect();
  try {
    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER,
        customer_code VARCHAR(50) UNIQUE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        address TEXT,
        village VARCHAR(100),
        latitude VARCHAR(50),
        longitude VARCHAR(50),
        user_uid VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        gst_number VARCHAR(15),
        pan_number VARCHAR(10),
        credit_limit DECIMAL(10, 2) DEFAULT '0',
        credit_used DECIMAL(10, 2) DEFAULT '0',
        credit_hold BOOLEAN DEFAULT false,
        store_credit DECIMAL(10, 2) DEFAULT '0',
        payment_terms INTEGER DEFAULT 30,
        customer_type VARCHAR(20) DEFAULT 'retail',
        loyalty_tier VARCHAR(20) DEFAULT 'bronze',
        loyalty_points INTEGER DEFAULT 0,
        tier_override BOOLEAN DEFAULT false,
        total_spent DECIMAL(12, 2) DEFAULT '0',
        lifetime_value DECIMAL(12, 2) DEFAULT '0',
        marketing_opt_in BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        is_deleted BOOLEAN DEFAULT false
      )
    `);

    // Insert customers in batches
    const batchSize = 50;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);

      // Build parameterized query to avoid SQL injection
      const params = [];
      const valuePlaceholders = [];

      for (let j = 0; j < batch.length; j++) {
        const customer = batch[j];
        const paramIndex = j * 8 + 1;
        valuePlaceholders.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6}, $${paramIndex+7})`);
        params.push(
          customer.name,
          customer.phone,
          customer.village,
          customer.customer_code,
          customer.user_uid,
          customer.status,
          customer.created_at,
          customer.updated_at
        );
      }

      const query = `
        INSERT INTO customers
        (name, phone, village, customer_code, user_uid, status, created_at, updated_at)
        VALUES ${valuePlaceholders.join(',')}
        ON CONFLICT (customer_code) DO NOTHING
      `;

      await client.query(query, params);
      console.log(`Inserted batch ${i / batchSize + 1}`);
    }

    console.log('Contact import completed successfully');
  } catch (error) {
    console.error('Error importing contacts:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importContacts().catch(console.error);