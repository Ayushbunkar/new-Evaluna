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
			`SELECT id, name, email, role, branch_id FROM "user"`
		);
		console.log("✅ Users Records:", JSON.stringify(result.rows, null, 2));
	} finally {
		await client.end();
	}
}

main();
