import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as authSchema from "./auth-schema";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is missing in environment variables.");
}

const cleanUrl = process.env.DATABASE_URL.replace(/^"|"$/g, "");
const isLocal = cleanUrl.includes("localhost") || cleanUrl.includes("127.0.0.1");

const pool = new Pool({
	connectionString: cleanUrl,
    ssl: isLocal ? undefined : { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema: { ...schema, ...authSchema } });
