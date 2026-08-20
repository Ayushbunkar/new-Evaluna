import {
	createCallerFactory,
	middleware,
	permissionProcedure,
	protectedProcedure,
	publicProcedure,
	requirePermission,
	roleProcedure,
	router,
	superadminProcedure,
	type TRPCContext,
} from "@evaluna/api";
import { getAuthUser } from "@/lib/auth-guard";
import { db } from "@/lib/db";

export type { TRPCContext };
export {
	createCallerFactory,
	middleware,
	permissionProcedure,
	protectedProcedure,
	publicProcedure,
	requirePermission,
	roleProcedure,
	router,
	superadminProcedure,
};

/**
 * Creates the TRPC context.
 * When called from the fetch route handler, opts.req contains the incoming
 * Request so we can pass its headers directly to getAuthUser — this ensures
 * cookies are always forwarded correctly on Vercel (where next/headers()
 * may not fully reflect the fetch-handler request).
 */
export const createTRPCContext = async (opts?: { req?: Request }): Promise<TRPCContext> => {
	const user = await getAuthUser(opts?.req ? new Headers(opts.req.headers) : undefined);

	// Transform CachedSession to match BaseUser interface
	const baseUser = user
		? {
				id: user.userId,
				name: user.name,
				email: user.email,
				role: user.role,
				branchId: user.branchId,
				isSuperadmin: user.isSuperadmin,
				isActive: user.isActive,
				permissions: user.permissions,
			}
		: null;

	if (!baseUser) {
		console.error(
			"[TRPC] createTRPCContext user is NULL! getAuthUser returned null",
		);
	}

	return { user: baseUser, db: db as any };
};
