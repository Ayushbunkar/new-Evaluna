import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.error("❌ DATABASE_URL is not set!");
		process.exit(1);
	}

	console.log("🔗 Connecting to the database...");
	const client = new Client({ connectionString: dbUrl });
	await client.connect();

	try {
		console.log("⚡ Executing ALTER TABLE customers ALTER COLUMN email DROP NOT NULL...");
		await client.query('ALTER TABLE "customers" ALTER COLUMN "email" DROP NOT NULL;');
		console.log("✅ Successfully altered customers table email column!");
	} catch (error) {
		console.error("❌ Error running migration:", error);
	} finally {
		await client.end();
		console.log("🔌 Connection closed.");
	}
}

main();
