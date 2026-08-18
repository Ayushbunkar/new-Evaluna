import { pg } from "pg";

// Database connection configuration using the existing .env
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function importCustomersFromCSV() {
  const fs = require('fs');
  const csv = require('csv-parser');
  
  const results = [];
  
  console.log("Starting to read Contacts.csv...");
  
  fs.createReadStream('./Contacts.csv')
    .pipe(csv())
    .on('data', (data) => {
      results.push({
        name: data['Customer Name'],
        phone: data['Contact Number'],
        village: data['Village Name']
      });
    })
    .on('end', async () => {
      console.log(`Parsed ${results.length} contacts from CSV`);
      
      const client = await pool.connect();
      try {
        // First, get or create a branch
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
        
        // Get or create staff user
        let staffId = 1;
        const staffResult = await client.query('SELECT id FROM staff LIMIT 1');
        if (staffResult.rows.length === 0) {
          const insertStaff = await client.query(`
            INSERT INTO staff (branch_id, staff_code, name, email, phone, role, join_date, salary, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
            RETURNING id
          `, [branchId, 'ADMIN001', 'System Administrator', 'admin@evaluna.com', '+91 9999999999', 'admin', NOW(), '50000', 'active']);
          staffId = insertStaff.rows[0].id;
          console.log(`Created staff with ID: ${staffId}`);
        } else {
          staffId = staffResult.rows[0].id;
          console.log(`Using existing staff with ID: ${staffId}`);
        }
        
        // Insert customers in batches
        const batchSize = 50;
        let insertedCount = 0;
        
        for (let i = 0; i < results.length; i += batchSize) {
          const batch = results.slice(i, i + batchSize);
          
          // Prepare values for batch insert
          const values = batch.map((customer, index) => {
            const cleanName = customer.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const customerCode = `${cleanName}_${Math.floor(Math.random() * 10000)}`;
            const cleanPhone = customer.phone.replace(/\s+/g, '').replace(/\//g, '');
            const email = `${cleanName.toLowerCase()}@example.com`.replace(/[^a-zA-Z0-9@.]/g, '');
            
            return `(
              ${branchId},
              '${customerCode.replace(/'/g, "''")}',
              '${customer.name.replace(/'/g, "''")}',
              '${email}',
              '${cleanPhone.substring(0, 20)}',
              '${customer.village.replace(/'/g, "''")}, India',
              '${customer.village}',
              NULL,
              NULL,
              'admin',
              'active',
              NULL,
              NULL,
              0.00,
              0.00,
              false,
              0.00,
              30,
              'retail',
              'bronze',
              0,
              false,
              0.00,
              0.00,
              true,
              NOW(),
              NOW(),
              NULL,
              false
            )`;
          }).join(',');
          
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
          `;
          
          const result = await client.query(query);
          insertedCount += result.rowCount;
          console.log(`Inserted batch ${Math.floor(i/batchSize) + 1} (${result.rowCount} rows)`);
        }
        
        console.log(`\n✅ Successfully imported ${insertedCount} customers from Contacts.csv`);
        
        // Show some samples
        const sampleResult = await client.query(`
          SELECT name, phone, village FROM customers 
          ORDER BY created_at DESC 
          LIMIT 5
        `);
        
        console.log("\nSample of imported customers:");
        sampleResult.rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.name} | ${row.phone} | ${row.village}`);
        });
        
      } catch (error) {
        console.error('❌ Error importing customers:', error);
      } finally {
        client.release();
        await pool.end();
      }
    });
}

importCustomersFromCSV().catch(console.error);
