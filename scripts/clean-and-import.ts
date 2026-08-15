import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const csvFilePath = path.join(__dirname, "../EVALUNA PVT LTD - Product_Master.csv");

function parseCSV(content: string): string[][] {
	const lines: string[][] = [];
	let row: string[] = [];
	let inQuotes = false;
	let currentVal = "";
	for (let i = 0; i < content.length; i++) {
		const char = content[i];
		const nextChar = content[i + 1];
		if (char === '"') {
			if (inQuotes && nextChar === '"') { currentVal += '"'; i++; }
			else { inQuotes = !inQuotes; }
		} else if (char === ',' && !inQuotes) {
			row.push(currentVal.trim()); currentVal = "";
		} else if ((char === '\r' || char === '\n') && !inQuotes) {
			if (char === '\r' && nextChar === '\n') i++;
			row.push(currentVal.trim());
			if (row.some(cell => cell !== "")) lines.push(row);
			row = []; currentVal = "";
		} else { currentVal += char; }
	}
	if (row.length > 0 || currentVal !== "") {
		row.push(currentVal.trim());
		if (row.some(cell => cell !== "")) lines.push(row);
	}
	return lines;
}

function cleanPrice(priceStr: string): string {
	if (!priceStr) return "0.00";
	const cleaned = priceStr.replace(/[₹,\s]/g, "");
	const num = parseFloat(cleaned);
	return isNaN(num) ? "0.00" : num.toFixed(2);
}

// Complete ordered list - deepest dependencies first
const DELETE_ORDER = [
	// Leaf tables (no other table references them)
	"audit_discrepancies",
	"stock_audit_items",
	"stock_audits",
	"missing_stock_queue",
	"batch_stock",
	"location_barcodes",
	"branch_damage",
	"put_list_items",
	"put_lists",
	"pack_lists",
	"pick_list_items",
	"pick_lists",
	"package_items",
	"packages",
	"sales_return_items",
	"sales_returns",
	"order_audits",
	"customer_ledger",
	"trip_collections",
	"trip_stops",
	"delivery_trips",
	"stock_ledger",
	"product_barcodes",
	"product_category_mapping",
	"product_batches",
	"stock_adjustments",
	"stock_transfers",
	"branch_inventory",
	"purchase_items",
	"purchases",
	"transactions",
	"order_items",
	"orders",
	"customers",
	"branch_locations",
	"products",
];

async function main() {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.error("❌ DATABASE_URL is not set in .env!");
		process.exit(1);
	}

	console.log("🔗 Connecting to the database...");
	const client = new Client({ connectionString: dbUrl });
	await client.connect();

	try {
		console.log("🗑️ Clearing all mock operational data (in FK-safe order)...");
		for (const table of DELETE_ORDER) {
			try {
				const result = await client.query(`DELETE FROM "${table}"`);
				console.log(`  ✓ ${table} (${result.rowCount} rows deleted)`);
			} catch (err: any) {
				console.warn(`  ⚠ Skipped ${table}: ${err.message}`);
			}
		}
		console.log("✅ Mock data cleared!");

		console.log("\n📄 Reading CSV file...");
		if (!fs.existsSync(csvFilePath)) throw new Error(`CSV not found at: ${csvFilePath}`);
		const csvContent = fs.readFileSync(csvFilePath, "utf-8");
		const rows = parseCSV(csvContent);

		const headers = rows.shift();
		console.log(`Headers: ${headers?.slice(0, 3).join(", ")}`);
		console.log(`Found ${rows.length} product rows.`);

		console.log("\n📥 Inserting products...");
		await client.query("BEGIN");
		let insertCount = 0;

		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			const name = row[0]?.trim();
			const procPrice = cleanPrice(row[1]);
			const sellPrice = cleanPrice(row[2]);
			if (!name) continue;
			const sku = `EVL-${String(i + 1).padStart(4, "0")}`;
			await client.query(
				`INSERT INTO products (name, base_procurement_price, base_selling_price, price, sku, user_uid, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $5, 'admin', NOW(), NOW())`,
				[name, procPrice, sellPrice, sellPrice, sku]
			);
			insertCount++;
		}

		await client.query("COMMIT");
		console.log(`\n🎉 Successfully imported ${insertCount} products from EVALUNA PVT LTD!`);
	} catch (error) {
		console.error("❌ Error:", error);
		try { await client.query("ROLLBACK"); } catch {}
	} finally {
		await client.end();
		console.log("🔌 Connection closed.");
	}
}

main();
