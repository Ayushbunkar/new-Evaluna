import { db } from "./packages/db/src/index";
import { customers, branches, staff } from "./packages/db/src/schema";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";

// Read the CSV file
const fileContent = readFileSync("./Contacts.csv", "utf8");
const lines = fileContent.trim().split("\n");

async function main() {
  try {
    console.log("Starting customer import using Drizzle...");

    // Get or create the main branch
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
    console.log(`Using branch ID: ${branchId}`);

    // Get or create an admin staff member
    let staffId = 1;
    const existingStaff = await db.select().from(staff).limit(1);
    if (existingStaff.length > 0) {
      staffId = existingStaff[0].id;
    } else {
      const [newStaff] = await db
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
      staffId = newStaff.id;
    }
    console.log(`Using staff ID: ${staffId}`);

    // Process CSV lines (skip header)
    const customersToInsert = [];
    let skipped = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [name, contactNumber, villageName] = line.split(",").map((field) => field.trim());

      if (!name || !contactNumber || !villageName) {
        skipped++;
        continue;
      }

      // Clean phone number: remove spaces and slashes
      const cleanPhone = contactNumber.replace(/\s+/g, "").replace(/\//g, "");

      // Generate a customer code
      const cleanName = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const customerCode = `${cleanName}_${Math.floor(Math.random() * 10000)}`;

      // Generate an email (optional, but we'll create one)
      const email = `${cleanName.toLowerCase()}@example.com`.replace(/[^a-zA-Z0-9@.]/g, "");

      customersToInsert.push({
        branch_id: branchId,
        customer_code: customerCode,
        name: name,
        email: email || undefined, // Only set if we have a valid email
        phone: cleanPhone.length > 0 && cleanPhone.length <= 20 ? cleanPhone : undefined,
        address: `${villageName}, India`,
        village: villageName,
        latitude: undefined,
        longitude: undefined,
        user_uid: "admin",
        status: "active",
        gst_number: undefined,
        pan_number: undefined,
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

    // Insert customers
    const result = await db.insert(customers).values(customersToInsert).returning();
    console.log(`Successfully inserted ${result.length} customers`);

    // Show a few examples
    console.log("\nSample of imported customers:");
    result.slice(0, 5).forEach((cust, index) => {
      console.log(`${index + 1}. ${cust.name} | ${cust.phone} | ${cust.village}`);
    });

    console.log("\n✅ Import completed successfully!");
  } catch (error) {
    console.error("❌ Error during import:", error);
    process.exit(1);
  }
}

main();