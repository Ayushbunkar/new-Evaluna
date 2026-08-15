import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";

if (!process.env.DATABASE_URL) {
	console.warn("DATABASE_URL is not set! Using mock URL for build-time compilation.");
}

const cleanUrl = DATABASE_URL.replace(/^"|"$/g, "");

// Use postgres.js for full transaction support (better than neon-http for full ERPs)
const sql = postgres(cleanUrl, { prepare: false });
export const db = drizzle(sql, { schema });

// re-export pglite instance for any code that needs direct access (null for postgres mode)
export const pglite = null;
