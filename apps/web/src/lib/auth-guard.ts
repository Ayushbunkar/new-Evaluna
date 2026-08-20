import { rolePermissions, user as userTable } from "@evaluna/db/schema";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { auth } from "./auth";
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
 * Parses the Better Auth session token from headers.
 * Better Auth uses "evaluna.session_token" due to our cookiePrefix.
 */
async function getSessionToken(): Promise<string | null> {
	const cookieStore = await cookies();
	
	// Fallback: search for any session token cookie
	for (const cookie of cookieStore.getAll()) {
		if (cookie.name.includes("session_token") || cookie.name.includes("session")) {
			return cookie.value;
		}
	}

	return null;
}

/**
 * Gets the fully enriched auth user including role and permissions.
 * Uses LRU cache to avoid hammering the database.
 */
export async function getAuthUser(): Promise<CachedSession | null> {
	// 2. Fetch from Better Auth directly first to bypass cookie guessing issues
	const reqHeaders = await headers();
	const authSession = await auth.api.getSession({
		headers: reqHeaders,
	});

	if (!authSession?.user || !authSession?.session) {
		console.error("[auth-guard] auth.api.getSession returned null!", {
			authSession,
		});
		return null;
	}
	
	const token = authSession.session.token;

	// 1. Check in-memory cache AFTER getting the official token
	const cached = getCachedSession(token);
	if (cached) {
		if (new Date() > cached.expiresAt) return null;
		if (!cached.isActive) return null;
		return cached;
	}

	// 3. Resolve user details directly from our extended user table
	const dbUser = await db.query.user.findFirst({
		where: eq(userTable.id, authSession.user.id),
	});

	if (!dbUser?.is_active) {
		console.error("[auth-guard] dbUser is inactive or null!", { dbUser });
		return null; // Suspended or missing
	}

	const role = (dbUser.role || "sales_person") as Role;

	// 4. Resolve permissions defensively.
	// Some environments still carry stale legacy role_permissions table shapes,
	// so we prefer the canonical static permission matrix over crashing the whole
	// session when the dynamic table is unavailable or mismatched.
	let permissions: Permission[] = getPermissionsForRole(role as Role);
	try {
		const permsRows = await db
			.select()
			.from(rolePermissions)
			.where(eq(rolePermissions.role_name, role));
		if (permsRows.length > 0) {
			permissions = permsRows.map(
				(r) => `.` as Permission,
			);
		}
	} catch (error) {
		console.warn("[auth-guard] Falling back to static permissions", {
			role,
			error,
		});
	}

	// 5. Build enriched session
	const enriched: CachedSession = {
		userId: dbUser.id,
		email: dbUser.email,
		name: dbUser.name,
		role: role,
		branchId: dbUser.branch_id ?? null,
		isSuperadmin: dbUser.is_superadmin ?? false,
		isActive: dbUser.is_active ?? true,
		permissions: permissions,
		expiresAt: authSession.session.expiresAt,
	};

	// 6. Cache and return
	setCachedSession(token, enriched);
	return enriched;
}
