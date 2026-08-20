import {
	rolePermissions,
	session as sessionTable,
	user as userTable,
} from "@evaluna/db/schema";
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
 * Extracts the session token from a cookie string.
 * Handles all Better Auth / evaluna cookie name variants.
 */
function extractSessionToken(cookieHeader: string): string | null {
	const pairs = cookieHeader.split(";").map((c) => c.trim());
	const cookieMap: Record<string, string> = {};
	for (const pair of pairs) {
		const idx = pair.indexOf("=");
		if (idx === -1) continue;
		const key = pair.slice(0, idx).trim();
		const val = pair.slice(idx + 1).trim();
		cookieMap[key] = val;
	}
	return (
		cookieMap["__Secure-evaluna.session_token"] ||
		cookieMap["evaluna.session_token"] ||
		cookieMap["__Secure-better-auth.session_token"] ||
		cookieMap["better-auth.session_token"] ||
		null
	);
}

/**
 * Gets the fully enriched auth user including role and permissions.
 *
 * When called from the TRPC route handler, pass the raw Request headers
 * directly so cookies are correctly read on Vercel (where nextCookies()
 * plugin causes auth.api.getSession to fail inside fetchRequestHandler).
 *
 * This function bypasses auth.api.getSession entirely and validates
 * the session token directly against the database.
 */
export async function getAuthUser(
	incomingHeaders?: Headers,
): Promise<CachedSession | null> {
	let sessionToken: string | null = null;

	if (incomingHeaders) {
		// Called from fetch/TRPC handler — parse cookies from raw header
		const cookieHeader = incomingHeaders.get("cookie") ?? "";
		sessionToken = extractSessionToken(cookieHeader);
	} else {
		// Called from Server Components / Server Actions
		const cookieStore = await cookies();
		sessionToken =
			cookieStore.get("__Secure-evaluna.session_token")?.value ||
			cookieStore.get("evaluna.session_token")?.value ||
			cookieStore.get("__Secure-better-auth.session_token")?.value ||
			cookieStore.get("better-auth.session_token")?.value ||
			null;
	}

	if (!sessionToken) {
		return null;
	}

	// 1. Check in-memory cache
	const cached = getCachedSession(sessionToken);
	if (cached) {
		if (new Date() > cached.expiresAt) return null;
		if (!cached.isActive) return null;
		return cached;
	}

	// 2. Look up session directly in DB (no Better Auth plugin chain)
	let sessionRecord: typeof sessionTable.$inferSelect | undefined;
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

	// 3. Resolve user from extended user table
	const dbUser = await db.query.user.findFirst({
		where: eq(userTable.id, sessionRecord.userId),
	});

	if (!dbUser?.is_active) {
		console.error("[auth-guard] dbUser is inactive or null!", { dbUser });
		return null;
	}

	const role = (dbUser.role || "sales_person") as Role;

	// 4. Resolve permissions defensively
	let permissions: Permission[] = getPermissionsForRole(role as Role);
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
		expiresAt: sessionRecord.expiresAt,
	};

	setCachedSession(sessionToken, enriched);
	return enriched;
}
