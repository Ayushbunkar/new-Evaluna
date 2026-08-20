import { rolePermissions, user as userTable } from "@evaluna/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
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
 * Gets the fully enriched auth user including role and permissions.
 * Accepts an optional Headers object from the incoming request so that
 * the TRPC route handler can pass the actual fetch Request headers directly,
 * bypassing the Next.js `headers()` helper which may not reflect the
 * fetch-handler request in all server environments.
 */
export async function getAuthUser(
	incomingHeaders?: Headers | ReturnType<typeof headers> extends Promise<infer T> ? T : never,
): Promise<CachedSession | null> {
	// Use provided headers (from raw Request) or fall back to next/headers
	const reqHeaders: Headers = (incomingHeaders as Headers) ?? (await headers() as unknown as Headers);

	let authSession: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
	try {
		authSession = await auth.api.getSession({
			headers: reqHeaders,
		});
	} catch (err) {
		console.error("[auth-guard] auth.api.getSession threw:", err);
		return null;
	}

	if (!authSession?.user || !authSession?.session) {
		return null;
	}

	const token = authSession.session.token;

	// Check in-memory cache
	const cached = getCachedSession(token);
	if (cached) {
		if (new Date() > cached.expiresAt) return null;
		if (!cached.isActive) return null;
		return cached;
	}

	// Resolve user details from our extended user table
	const dbUser = await db.query.user.findFirst({
		where: eq(userTable.id, authSession.user.id),
	});

	if (!dbUser?.is_active) {
		console.error("[auth-guard] dbUser is inactive or null!", { dbUser });
		return null;
	}

	const role = (dbUser.role || "sales_person") as Role;

	// Resolve permissions defensively
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

	// Build enriched session
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

	setCachedSession(token, enriched);
	return enriched;
}
