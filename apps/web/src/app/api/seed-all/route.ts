export const dynamic = "force-dynamic";

import {
  branches,
  branchLocations,
  customers,
  orders,
  packageItems,
  packages,
  pickListItems,
  pickLists,
  products,
  purchaseItems,
  purchases,
  staff,
  suppliers,
  normalizePhone,
} from "@evaluna/db/schema";
import { deliveryTrips, tripStops, tripCollections } from "@evaluna/db/schema/delivery";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readFileSync } from "fs";
import { parse } from "csv-parser";

export async function GET() {
  try {
    console.log("Starting CSV import for customer data...");

    // 1. Branch - Get or create main branch
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

    // 2. Staff - Get or create staff (for references)
    let staffId = 1;
    const existingStaff = await db.select().from(staff).limit(1);
    if (existingStaff.length > 0) {
      staffId = existingStaff[0].id;
    } else {
      const staffData = [
        {
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
        }
      ];
      const insertedStaff = await db
        .insert(staff)
        .values(staffData)
        .returning();
      staffId = insertedStaff[0].id;
    }

    // 3. Location - Get or create default location
    let locId = 1;
    const existingLoc = await db.select().from(branchLocations).limit(1);
    if (existingLoc.length > 0) {
      locId = existingLoc[0].id;
    } else {
      const [newLocation] = await db
        .insert(branchLocations)
        .values({
          branch_id: branchId,
          name: "DEFAULT",
          section: "MAIN",
          aisle: "A1",
          shelf: "01",
          level: "L1",
          location_type: "storage",
          capacity: 1000,
          current_stock: 0,
          is_active: true,
        })
        .returning();
      locId = newLocation.id;
    }

    // 4. Products - Create sample products if none exist
    let productId = 1;
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length === 0) {
      const prodData = [
        {
          name: "Sample Product A",
          description: "Sample product for testing",
          base_procurement_price: "100.00",
          base_selling_price: "150.00",
          price: "150.00",
          user_uid: "admin",
          category: "Sample",
          hsn: "1234",
          taxable: true,
          barcode: "SAMPLE001",
          sku: "SAMP-A",
          unit: "Nos",
          is_pack: false,
          loose_product_id: null,
          units_per_pack: null,
          is_weighted: false,
          is_reward_item: false,
          visibility_level: "global",
          is_hidden: false,
        },
        {
          name: "Sample Product B",
          description: "Another sample product",
          base_procurement_price: "200.00",
          base_selling_price: "250.00",
          price: "250.00",
          user_uid: "admin",
          category: "Sample",
          hsn: "1235",
          taxable: true,
          barcode: "SAMPLE002",
          sku: "SAMP-B",
          unit: "Nos",
          is_pack: false,
          loose_product_id: null,
          units_per_pack: null,
          is_weighted: false,
          is_reward_item: false,
          visibility_level: "global",
          is_hidden: false,
        }
      ];
      const insertedProducts = await db
        .insert(products)
        .values(prodData)
        .returning();
      productId = insertedProducts[0].id;
    }

    // 5. Suppliers - Create sample suppliers if none exist
    let supplierId = 1;
    const existingSuppliers = await db.select().from(suppliers).limit(1);
    if (existingSuppliers.length === 0) {
      const suppData = [
        {
          supplier_code: "SUP001",
          name: "Sample Supplier A",
          email: "supplya@example.com",
          phone: "+91 9876543210",
          address: "Supplier Address A",
          gst_number: "24ABCDE1234F1Z5",
          pan_number: "ABCDE1234F",
          outstanding_balance: "0.00",
          supplier_category: "local",
        },
        {
          supplier_code: "SUP002",
          name: "Sample Supplier B",
          email: "supplyb@example.com",
          phone: "+91 9876543211",
          address: "Supplier Address B",
          gst_number: "24ABCDE1234F1Z6",
          pan_number: "ABCDE1234G",
          outstanding_balance: "0.00",
          supplier_category: "local",
        }
      ];
      const insertedSuppliers = await db
        .insert(suppliers)
        .values(suppData)
        .returning();
      supplierId = insertedSuppliers[0].id;
    }

    // 6. READ AND PROCESS CSV DATA FOR CUSTOMERS
    console.log("Reading Contacts.csv file...");
    const csvFilePath = "./Contacts.csv";
    const fileContent = readFileSync(csvFilePath, 'utf8');

    const customersFromCSV = [];
    const lines = fileContent.trim().split('\n');

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [name, contactNumber, villageName] = line.split(',').map(field => field.trim());

      if (name && contactNumber && villageName) {
        // Clean phone number: preserve two-number entries (joined with ", ")
        const cleanPhone = normalizePhone(contactNumber);

        // Generate a unique customer code from name
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const customerCode = `${cleanName}_${Math.floor(Math.random() * 1000)}`;

        // Generate email if not provided (optional field)
        const email = `${cleanName.toLowerCase()}@example.com`.replace(/[^a-zA-Z0-9@.]/g, '');

        customersFromCSV.push({
          branch_id: branchId,
          customer_code: customerCode,
          name: name,
          email: email || undefined, // Only set if valid
          phone: cleanPhone && cleanPhone.length <= 30 ? cleanPhone : undefined,
          address: `${villageName}, India`, // Construct address from village
          village: villageName,
          latitude: undefined, // Not provided in CSV
          longitude: undefined, // Not provided in CSV
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
    }

    console.log(`Processed ${customersFromCSV.length} customers from CSV`);

    // Insert customers from CSV
    let customerId = 1;
    const existingCustomers = await db.select().from(customers).limit(1);
    if (existingCustomers.length > 0) {
      // If customers already exist, we'll skip creation to avoid duplicates
      // In a real scenario, you might want to update or check for duplicates
      customerId = existingCustomers[0].id;
      console.log("Customers already exist in database, skipping CSV import for customers");
    } else if (customersFromCSV.length > 0) {
      const insertedCustomers = await db
        .insert(customers)
        .values(customersFromCSV)
        .returning();

      customerId = insertedCustomers[0]?.id || 1;
      console.log(`Successfully inserted ${insertedCustomers.length} customers from CSV`);
    }

    // 7. ORDERS - Create sample orders if none exist
    let orderId = 1;
    const existingOrders = await db.select().from(orders).limit(1);
    if (existingOrders.length === 0) {
      const ordData = [];
      for (let i = 1; i <= Math.min(10, customersFromCSV.length || 5); i++) {
        ordData.push({
          customer_id: customerId,
          total_amount: `${1000 + i * 100}`,
          cgst_amount: "90.00",
          sgst_amount: "90.00",
          igst_amount: "0.00",
          discount_amount: "0.00",
          other_charges: "0.00",
          user_uid: "admin",
          status: i % 2 === 0 ? "completed" : "processing",
          payment_method_id: supplierId,
          e_way_bill_no: `EWB${String(i).padStart(12, '0')}`,
          gst_breakdown: JSON.stringify({ cgst: 90, sgst: 90, igst: 0 }),
        });
      }
      const insertedOrders = await db
        .insert(orders)
        .values(ordData)
        .returning();
      orderId = insertedOrders[0]?.id || 1;
    }

    // 8. PICK LISTS - Create if none exist
    const existingPickLists = await db.select().from(pickLists).limit(1);
    if (existingPickLists.length === 0) {
      const pickListData = [];
      for (let i = 1; i <= 5; i++) {
        pickListData.push({
          order_id: orderId,
          reference_type: "sale",
          reference_id: orderId,
          assigned_to: staffId,
          priority: i % 2 === 0 ? "high" : "normal",
          status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "picking" : "pending",
        });
      }
      const insertedPickLists = await db
        .insert(pickLists)
        .values(pickListData)
        .returning();

      // Pick List Items
      for (const pl of insertedPickLists) {
        const itemCount = pl.status === "completed" ? 3 : 1;
        for (let j = 0; j < itemCount; j++) {
          await db.insert(pickListItems).values({
            pick_list_id: pl.id,
            product_id: productId,
            location_id: locId,
            quantity_ordered: Math.floor(Math.random() * 5) + 1,
            quantity_picked: pl.status === "completed" ? 3 : 0,
            status: pl.status === "completed" ? "picked" : "pending",
          });
        }
      }
    }

    // 9. PACKAGES - Create if none exist
    const existingPackages = await db.select().from(packages).limit(1);
    if (existingPackages.length === 0) {
      const packageData = [];
      for (let i = 1; i <= 3; i++) {
        packageData.push({
          order_id: orderId,
          pick_list_id: 1, // Assuming first pick list
          package_number: `PKG-2026-${String(i).padStart(4, '0')}`,
          status: i % 3 === 0 ? "checked" : i % 3 === 1 ? "packed" : "packing",
          packed_by: staffId,
          checked_by: i % 3 === 0 ? staffId : null,
          packed_at: new Date(),
          checked_at: i % 3 === 0 ? new Date() : null,
          weight: `${2.5 + i * 0.5}`,
          dimensions: `${10+i}x${10+i}x${10+i} cm`,
          notes: `Package ${i} for order ${orderId}`,
        });
      }
      const insertedPkgs = await db
        .insert(packages)
        .values(packageData)
        .returning();

      // Package Items
      for (const pkg of insertedPkgs) {
        await db.insert(packageItems).values({
          package_id: pkg.id,
          product_id: productId,
          quantity: Math.floor(Math.random() * 10) + 1,
        });
      }
    }

    // 10. PURCHASES - Create if none exist
    const existingPurchases = await db.select().from(purchases).limit(1);
    if (existingPurchases.length === 0) {
      const purchData = [];
      for (let i = 1; i <= 5; i++) {
        purchData.push({
          supplier_id: supplierId,
          branch_id: branchId,
          grn_number: `GRN-2026-${String(i).padStart(3, '0')}`,
          total_amount: `${5000 + i * 500}`,
          cgst_amount: "450.00",
          sgst_amount: "450.00",
          igst_amount: "0.00",
          amount_paid: "0.00",
          payment_status: "unpaid",
          user_uid: "admin",
          status: i % 2 === 0 ? "received" : "pending",
        });
      }
      const insertedPurchases = await db
        .insert(purchases)
        .values(purchData)
        .returning();

      for (const p of insertedPurchases) {
        await db.insert(purchaseItems).values({
          purchase_id: p.id,
          product_id: productId,
          quantity: 10 + p.id,
          price: "500.00",
          cgst_rate: "9.00",
          sgst_rate: "9.00",
          igst_rate: "0.00",
          cgst_amount: `${(10 + p.id) * 500 * 0.09}`,
          sgst_amount: `${(10 + p.id) * 500 * 0.09}`,
          igst_amount: "0.00",
        });
      }
    }

    // 11. DELIVERY TRIPS - Create if none exist
    const existingTrips = await db.select().from(deliveryTrips).limit(1);
    if (existingTrips.length === 0) {
      const tripData = [];
      for (let i = 1; i <= 3; i++) {
        tripData.push({
          branch_id: branchId,
          driver_id: staffId,
          vehicle_id: null,
          status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "active" : "pending",
          start_time: new Date(),
          end_time: i % 3 === 0 ? new Date() : null,
          total_distance: `${50 + i * 10}.00`,
          expected_cash_collection: `${1000 + i * 200}.00`,
          actual_cash_collection: i % 3 === 0 ? `${1000 + i * 200}.00` : "0.00",
          expected_stops: 2,
          completed_stops: i % 3 === 0 ? 2 : 0,
        });
      }
      const insertedTrips = await db
        .insert(deliveryTrips)
        .values(tripData)
        .returning();

      // Delivery Stops
      for (const trip of insertedTrips) {
        await db.insert(tripStops).values({
          trip_id: trip.id,
          order_id: orderId,
          sequence: 1,
          status: trip.status === "completed" ? "delivered" : "pending",
          comments: `Delivery stop for trip ${trip.id}`,
        });

        if (trip.status === "completed" || trip.status === "active") {
          await db.insert(tripCollections).values({
            trip_id: trip.id,
            payment_method: "cash",
            amount: `${500 + trip.id * 100}.00`,
            collected_by: staffId,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Customer data import completed! Processed ${customersFromCSV.length} customers from Contacts.csv`,
      customers_imported: customersFromCSV.length,
      branch_id: branchId,
      staff_id: staffId,
      location_id: locId,
      product_id: productId,
      supplier_id: supplierId,
      customer_id: customerId,
      order_id: orderId,
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}