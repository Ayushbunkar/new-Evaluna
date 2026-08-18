import { db } from './packages/db/src/index.js';
import { customers } from './packages/db/src/schema.js';
import { readFileSync } from 'fs';

// Read the CSV file
const fileContent = readFileSync('./Contacts.csv', 'utf8');
const lines = fileContent.trim().split('\n');

// Process CSV data
const customersToInsert = [];
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const [name, contactNumber, villageName] = line.split(',').map(field => field.trim());

  if (!name || !contactNumber || !villageName) {
    skipped++;
    continue;
  }

  // Clean phone number
  const cleanPhone = contactNumber.replace(/\s+/g, '').replace(/\//g, '');

  // Generate customer code
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const customerCode = `${cleanName}_${Math.floor(Math.random() * 10000)}`;

  // Generate email
  const email = `${cleanName.toLowerCase()}@example.com`.replace(/[^a-zA-Z0-9@.]/g, '');

  customersToInsert.push({
    branch_id: 1, // We'll get the branch id below
    customer_code: customerCode,
    name: name,
    email: email || undefined,
    phone: cleanPhone.length > 0 && cleanPhone.length <= 20 ? cleanPhone : undefined,
    address: `${villageName}, India`,
    village: villageName,
    latitude: undefined,
    longitude: undefined,
    user_uid: 'admin',
    status: 'active',
    gst_number: undefined,
    pan_number: undefined,
    credit_limit: '0.00',
    credit_used: '0.00',
    credit_hold: false,
    store_credit: '0.00',
    payment_terms: 30,
    customer_type: 'retail',
    loyalty_tier: 'bronze',
    loyalty_points: 0,
    tier_override: false,
    total_spent: '0.00',
    lifetime_value: '0.00',
    marketing_opt_in: true,
  });
}

console.log(`Processed ${customersToInsert.length} customers from CSV (skipped ${skipped})`);

if (customersToInsert.length === 0) {
  console.log('No customers to insert!');
  process.exit(0);
}

// Get or create branch and staff
async function main() {
  try {
    // Get or create the main branch
    let branchId = 1;
    const existingBranches = await db.select().from(branches).limit(1);
    if (existingBranches.length > 0) {
      branchId = existingBranches[0].id;
    } else {
      const [newBranch] = await db
        .insert(branches)
        .values({
          name: 'Main Warehouse',
          code: 'MAIN',
          address: 'Central Location',
          phone: '',
          email: '',
          manager_id: null,
          is_headquarters: true,
        })
        .returning();
      branchId = newBranch.id;
    }
    console.log(`Using branch ID: ${branchId}`);

    // Get or create staff
    let staffId = 1;
    const existingStaff = await db.select().from(staff).limit(1);
    if (existingStaff.length > 0) {
      staffId = existingStaff[0].id;
    } else {
      const [newStaff] = await db
        .insert(staff)
        .values({
          branch_id: branchId,
          staff_code: 'ADMIN001',
          name: 'System Administrator',
          email: 'admin@evaluna.com',
          phone: '+91 9999999999',
          role: 'admin',
          join_date: new Date(),
          salary: '50000',
          department: 'Administration',
          status: 'active',
        })
        .returning();
      staffId = newStaff.id;
    }
    console.log(`Using staff ID: ${staffId}`);

    // Update the branch_id and user_uid in the customers to insert
    const customersWithIds = customersToInsert.map(cust => ({
      ...cust,
      branch_id: branchId,
      user_uid: 'admin', // We'll use the admin user's uid? Actually, we should use the staff's user_uid? 
      // In the seed script, they use the user from the auth signUp. But for simplicity, let's use 'admin' as the user_uid.
      // We'll leave it as 'admin' for now.
    }));

    // Insert customers
    const result = await db.insert(customers).values(customersWithIds).returning();
    console.log(`✅ Successfully inserted ${result.length} customers`);

    // Show sample
    console.log('\nSample of imported customers:');
    result.slice(0, Math.min(5, result.length)).forEach((cust, index) => {
      console.log(`${index + 1}. ${cust.name} | ${cust.phone} | ${cust.village}`);
    });
  } catch (error) {
    console.error('❌ Error inserting customers:', error);
    process.exit(1);
  }
}

// Import required schemas
import { branches } from './packages/db/src/schema.js';
import { staff } from './packages/db/src/schema.js';

// Run the import
main();
