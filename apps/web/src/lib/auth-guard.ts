
import { rolePermissions } from "@evaluna/db/schema";
import {
	session as sessionTable,
	user as userTable,
} from "@evaluna/db/auth-schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "./db";
import {
	getPermissionsForRole,
	type Permission,
	type Role,
} from "./permissions";
import {
	type CachedSession,
	getCachedSession,
	setCachedSession,
} from "./session-cache";

/**
 * Gets the fully enriched auth user including role and permissions.
 *
 * This function bypasses auth.api.getSession entirely and validates
 * the session token directly against the database to avoid Better Auth
 * plugin conflicts with Next.js cookie writing rules in route handlers.
 */
export async function getAuthUser(): Promise<CachedSession | null> {
	// 1. Read cookies safely using Next.js native API (works everywhere for read)
	let cookieStore;
	try {
		cookieStore = await cookies();
	} catch (err) {
		console.error("[auth-guard] Failed to await cookies():", err);
		return null;
	}

	const sessionToken =
		cookieStore.get("__Secure-evaluna.session_token")?.value ||
		cookieStore.get("evaluna.session_token")?.value ||
		cookieStore.get("__Secure-better-auth.session_token")?.value ||
		cookieStore.get("better-auth.session_token")?.value ||
		null;

	if (!sessionToken) {
		console.log("[auth-guard] sessionToken is null. Cookies found:", cookieStore.getAll().map(c => c.name).join(", "));
		return null;
	}

	// 2. Check in-memory cache
	const cached = getCachedSession(sessionToken);
	if (cached) {
		if (new Date() > cached.expiresAt) return null;
		if (!cached.isActive) return null;
		return cached;
	}

	// 3. Look up session directly in DB
	let sessionRecord;
	try {
		sessionRecord = await db.query.session.findFirst({
			where: eq(sessionTable.token, sessionToken),
		});
	} catch (err) {
		console.error("[auth-guard] session lookup failed:", err);
		return null;
	}

	if (!sessionRecord || sessionRecord.expiresAt < new Date()) {
		return null;
	}

	// 4. Resolve user
	const dbUser = await db.query.user.findFirst({
		where: eq(userTable.id, sessionRecord.userId),
	});

	if (!dbUser?.is_active) {
		return null;
	}

	const role = (dbUser.role || "sales_person") as Role;

	// 5. Resolve permissions
	let permissions: Permission[] = getPermissionsForRole(role);
	try {
		const permsRows = await db
			.select()
			.from(rolePermissions)
			.where(eq(rolePermissions.role_name, role));
		if (permsRows.length > 0) {
			permissions = permsRows.map(
				(r) => `${r.domain}.${r.action}` as Permission,
			);
		}
	} catch (error) {
		// fall back to static
	}

	const enriched: CachedSession = {
		userId: dbUser.id,
		email: dbUser.email,
		name: dbUser.name,
		role: role,
		branchId: dbUser.branch_id ?? null,
		isSuperadmin: dbUser.is_superadmin ?? false,
		isActive: dbUser.is_active ?? true,
		permissions: permissions,
		expiresAt: sessionRecord.expiresAt,
	};

	setCachedSession(sessionToken, enriched);
	return enriched;
}

