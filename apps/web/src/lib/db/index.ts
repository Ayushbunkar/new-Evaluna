import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";

if (!process.env.DATABASE_URL) {
	console.warn("DATABASE_URL is not set! Using mock URL for build-time compilation.");
}

const cleanUrl = DATABASE_URL.replace(/^"|"$/g, "");
const isLocal = cleanUrl.includes("localhost") || cleanUrl.includes("127.0.0.1");

// Use pg for full transaction support
const pool = new Pool({ 
    connectionString: cleanUrl,
    ssl: isLocal ? undefined : { rejectUnauthorized: false }
});
export const db = drizzle(pool, { schema });

// re-export pglite instance for any code that needs direct access (null for postgres mode)
export const pglite = null;
