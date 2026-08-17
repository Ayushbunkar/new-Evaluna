const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'evaluna',
  password: 'yourpassword',
  port: 5432,
});

async function importContacts() {
  const results = [];

  fs.createReadStream('Contacts.csv')
    .pipe(csv())
    .on('data', (data) => {
      results.push({
        name: data['Customer Name'],
        phone: data['Contact Number'],
        village: data['Village Name'],
        customer_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        user_uid: 'system',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      });
    })
    .on('end', async () => {
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
          const values = batch.map((customer, index) => `
            ('${customer.name}', '${customer.phone}', '${customer.village}', '${customer.customer_code}', '${customer.user_uid}', '${customer.status}', '${customer.created_at.toISOString()}', '${customer.updated_at.toISOString()}')
          `).join(',');

          await client.query(`
            INSERT INTO customers
            (name, phone, village, customer_code, user_uid, status, created_at, updated_at)
            VALUES ${values}
            ON CONFLICT (customer_code) DO NOTHING
          `);
          console.log(`Inserted batch ${i / batchSize + 1}`);
        }

        console.log('Contact import completed successfully');
      } catch (error) {
        console.error('Error importing contacts:', error);
      } finally {
        client.release();
        await pool.end();
      }
    });
}

importContacts().catch(console.error);