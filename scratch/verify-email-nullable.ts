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
			`SELECT column_name, is_nullable, data_type 
			 FROM information_schema.columns 
			 WHERE table_name = 'customers' AND column_name = 'email'`
		);
		console.log("✅ Email column status:", JSON.stringify(result.rows));
		// is_nullable = YES means NULL is allowed (our change worked!)
	} finally {
		await client.end();
	}
}

main();
