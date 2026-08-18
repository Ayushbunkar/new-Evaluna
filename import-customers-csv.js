import { db } from "./packages/db/src/index.js";
import { customers } from "./packages/db/src/schema.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";
import { parse } from "csv-parser";
import { pipeline } from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(pipeline);

async function importCustomersFromCSV() {
  try {
    console.log("Starting CSV import for customer data...");

    // Get or create main branch
    let branchId = 1;
    const existingBranches = await db.select().from(branches).limit(1);
    if (existingBranches.length > 0) {
      branchId = existingBranches[0].id;
    } else {
      const [newBranch] = await db
        .insert(branches)
        .values({
          name: "Main Warehouse",
          code: "MAIN",
          address: "Central Location",
          phone: "",
          email: "",
          manager_id: null,
          is_headquarters: true,
        })
        .returning();
      branchId = newBranch.id;
    }

    // Get or create admin staff
    let staffId = 1;
    const existingStaff = await db.select().from(staff).limit(1);
    if (existingStaff.length > 0) {
      staffId = existingStaff[0].id;
    } else {
      const [adminStaff] = await db
        .insert(staff)
        .values({
          branch_id: branchId,
          staff_code: "ADMIN001",
          name: "System Administrator",
          email: "admin@evaluna.com",
          phone: "+91 9999999999",
          role: "admin",
          join_date: new Date(),
          salary: "50000",
          department: "Administration",
          status: "active",
        })
        .returning();
      staffId = adminStaff.id;
    }

    // Read and process CSV
    console.log("Reading Contacts.csv file...");
    const fileContent = readFileSync("./Contacts.csv", 'utf8');
    const lines = fileContent.trim().split('\n');

    // Skip header
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

      // Skip if phone is empty after cleaning
      if (!cleanPhone || cleanPhone.length === 0) {
        skipped++;
        continue;
      }

      // Generate customer code
      const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const customerCode = `${cleanName}_${Math.floor(Math.random() * 10000)}`.toUpperCase();

      // Generate email
      const emailPrefix = cleanName.toLowerCase();
      const email = `${emailPrefix}@example.com`.replace(/[^a-zA-Z0-9@.]/g, '');

      customersToInsert.push({
        branch_id: branchId,
        customer_code: customerCode,
        name: name,
        email: email,
        phone: cleanPhone.length <= 20 ? cleanPhone : cleanPhone.substring(0, 20),
        address: `${villageName}, India`,
        village: villageName,
        latitude: null,
        longitude: null,
        user_uid: "admin",
        status: "active",
        gst_number: null,
        pan_number: null,
        credit_limit: "0.00",
        credit_used: "0.00",
        credit_hold: false,
        store_credit: "0.00",
        payment_terms: 30,
        customer_type: "retail",
        loyalty_tier: "bronze",
        loyalty_points: 0,
        tier_override: false,
        total_spent: "0.00",
        lifetime_value: "0.00",
        marketing_opt_in: true,
      });
    }

    console.log(`Processed ${customersToInsert.length} customers from CSV (skipped ${skipped})`);

    if (customersToInsert.length === 0) {
      console.log("No customers to insert!");
      return;
    }

    // Check if we already have customers to avoid duplicates
    const existingCount = await db.select({ count: db.count() }).from(customers);
    if (existingCount[0].count > 0) {
      console.log(`Database already has ${existingCount[0].count} customers. Checking for duplicates...`);

      // Insert only new customers (simple approach - we could make this smarter)
      const insertedCustomers = await db
        .insert(customers)
        .values(customersToInsert)
        .onConflictDoNothing()
        .returning();

      console.log(`Successfully inserted ${insertedCustomers.length} new customers`);
    } else {
      // No existing customers, insert all
      const insertedCustomers = await db
        .insert(customers)
        .values(customersToInsert)
        .returning();

      console.log(`Successfully inserted ${insertedCustomers.length} customers`);
    }

    // Show sample of imported customers
    const sampleCustomers = await db
      .select()
      .from(customers)
      .limit(5);

    console.log("\nSample of imported customers:");
    console.log("----------------------------------------");
    sampleCustomers.forEach((cust, index) => {
      console.log(`${index + 1}. ${cust.name} | ${cust.phone} | ${cust.village}`);
    });

    console.log("\n✅ CSV import completed successfully!");

  } catch (error) {
    console.error("❌ Error importing customers:", error);
    process.exit(1);
  }
}

// Import required tables
import { branches } from "./packages/db/src/schema.js";
import { staff } from "./packages/db/src/schema.js";

// Run the import
importCustomersFromCSV();