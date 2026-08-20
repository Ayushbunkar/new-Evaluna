import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { account, session, user, verification } from "@evaluna/db/auth-schema";
import { db } from "./db";

// Explicitly pass the auth tables so better-auth's drizzle adapter
// can find every column (including "issuer" added in v1.7.1)
const authSchema = { user, session, account, verification };

export const auth = betterAuth({
	secret:
		process.env.BETTER_AUTH_SECRET ||
		"evaluna_super_secret_fallback_key_1234567890",

	// Do NOT hardcode baseURL — better-auth auto-detects from each request
	database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),

	user: {
		additionalFields: {
			role: { type: "string", defaultValue: "sales_person" },
			branch_id: { type: "number", required: false },
			is_active: { type: "boolean", defaultValue: true },
			is_superadmin: { type: "boolean", defaultValue: false },
		},
	},

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 8,
	},

	session: {
		expiresIn: 60 * 60 * 24 * 365, // 1 year
		updateAge: 60 * 60,
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
		},
	},

	rateLimit: {
		window: 60,
		max: 1000,
		customRules: {
			"/sign-in": { window: 60, max: 10 },
			"/sign-up": { window: 60, max: 10 },
		},
	},

	plugins: [
		twoFactor({
			issuer: "Evaluna ERP",
			otpOptions: { period: 30, digits: 6 },
		}),
		nextCookies(), // MUST be last
	],

	advanced: {
		cookiePrefix: "evaluna",
		useSecureCookies: process.env.NODE_ENV === "production",
		generateId: () => crypto.randomUUID(),
	},
});
