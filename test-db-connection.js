const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Get PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    console.log(`PostgreSQL version: ${versionResult.rows[0].version}`);
    
    // Check if customers table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customers'
      );
    `);
    console.log(`Customers table exists: ${tableCheck.rows[0].exists}`);
    
    // Count existing customers
    const countResult = await client.query('SELECT COUNT(*) as count FROM customers');
    console.log(`Existing customers: ${countResult.rows[0].count}`);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();
