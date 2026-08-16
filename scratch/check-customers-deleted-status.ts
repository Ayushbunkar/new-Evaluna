import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) { console.error("❌ DATABASE_URL not set!"); process.exit(1); }

	const client = new Client({ connectionString: dbUrl });
	await client.connect();

	try {
		const result = await client.query(
			`SELECT id, name, branch_id, is_deleted, deleted_at FROM customers`
		);
		console.log("✅ Customers Records:", JSON.stringify(result.rows, null, 2));
	} finally {
		await client.end();
	}
}

main();
