
import { rolePermissions } from "@evaluna/db/schema";
import {
	session as sessionTable,
	user as userTable,
} from "@evaluna/db/auth-schema";
import { eq, inArray } from "drizzle-orm";
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
export async function getAuthUser(
	reqHeaders?: Headers,
): Promise<CachedSession | null> {
	// 1. Resolve the session token.
	// Prefer the cookie header from the incoming request (passed by the tRPC
	// fetch route handler) — on Vercel, next/headers cookies() can come back
	// empty inside fetch route handlers, which would treat every API call as
	// logged-out. Fall back to next/headers cookies() for RSC/server usage.
	let sessionToken: string | null = null;

	const COOKIE_NAMES = [
		"__Secure-evaluna.session_token",
		"evaluna.session_token",
		"__Secure-better-auth.session_token",
		"better-auth.session_token",
	];

	if (reqHeaders) {
		const cookieHeader = reqHeaders.get("cookie") || "";
		const parsed = new Map<string, string>();
		for (const part of cookieHeader.split(";")) {
			const idx = part.indexOf("=");
			if (idx === -1) continue;
			const name = part.slice(0, idx).trim();
			const value = part.slice(idx + 1).trim();
			if (name) parsed.set(name, decodeURIComponent(value));
		}
		for (const name of COOKIE_NAMES) {
			const v = parsed.get(name);
			if (v) {
				sessionToken = v;
				break;
			}
		}
	}

	if (!sessionToken) {
		let cookieStore;
		try {
			cookieStore = await cookies();
		} catch (err) {
			console.error("[auth-guard] Failed to await cookies():", err);
			return null;
		}
		for (const name of COOKIE_NAMES) {
			const v = cookieStore.get(name)?.value;
			if (v) {
				sessionToken = v;
				break;
			}
		}
		if (!sessionToken) {
			console.log(
				"[auth-guard] sessionToken is null. Cookies found:",
				cookieStore.getAll().map((c) => c.name).join(", "),
			);
		}
	}

	if (!sessionToken) {
		return null;
	}

	// 2. Better Auth signs the session cookie as `${token}.${signature}`.
	// The DB `session.token` column stores only the raw token (no signature),
	// so match against both the full cookie value and the token portion before
	// the signature — this is why the previous direct lookup always missed and
	// every API call came back "Not logged in".
	const dotIdx = sessionToken.lastIndexOf(".");
	const rawToken = dotIdx > 0 ? sessionToken.slice(0, dotIdx) : sessionToken;
	const candidateTokens = Array.from(new Set([sessionToken, rawToken]));

	// 2b. Check in-memory cache (keyed on whichever token we end up matching)
	for (const t of candidateTokens) {
		const cached = getCachedSession(t);
		if (cached) {
			if (new Date() > cached.expiresAt) return null;
			if (!cached.isActive) return null;
			return cached;
		}
	}

	// 3. Look up session directly in DB
	let sessionRecord;
	try {
		sessionRecord = await db.query.session.findFirst({
			where: inArray(sessionTable.token, candidateTokens),
		});
	} catch (err) {
		console.error("[auth-guard] session lookup failed:", err);
		return null;
	}

	if (!sessionRecord || sessionRecord.expiresAt < new Date()) {
		console.log(
			"[auth-guard] no valid session for token. candidates tried:",
			candidateTokens.length,
			"found:",
			!!sessionRecord,
		);
		return null;
	}

	// Use the actual stored token as the cache key going forward
	const matchedToken = sessionRecord.token;
	console.log(
		"[auth-guard] session matched. userId:",
		sessionRecord.userId,
	);

	// 4. Resolve user
	const dbUser = await db.query.user.findFirst({
		where: eq(userTable.id, sessionRecord.userId),
	});

	if (!dbUser) {
		console.log(
			"[auth-guard] session found but user row missing for userId:",
			sessionRecord.userId,
		);
		return null;
	}

	if (dbUser.is_active === false) {
		console.log(
			"[auth-guard] user is_active is false. userId:",
			dbUser.id,
			"email:",
			dbUser.email,
		);
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

	setCachedSession(matchedToken, enriched);
	return enriched;
}

