import { auth } from "../apps/web/src/lib/auth";
import { db } from "../apps/web/src/lib/db";
import { user } from "../packages/db/src/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const USERS_TO_SEED = [
	{ name: "Super Admin", email: "superadmin@evaluna.com", role: "superadmin" },
	{ name: "Admin", email: "admin@evaluna.com", role: "admin" },
	{ name: "Manager", email: "manager@evaluna.com", role: "manager" },
	{ name: "Sales Manager", email: "sales@evaluna.com", role: "sales_person" },
	{ name: "Auditor Desk", email: "auditor@evaluna.com", role: "auditor" },
	{ name: "HR Manager", email: "hr@evaluna.com", role: "hr" },
	{ name: "Warehouse Picker", email: "picker@evaluna.com", role: "picker" },
	{ name: "Warehouse Putter", email: "putter@evaluna.com", role: "putter" },
	{ name: "Driver / Delivery", email: "driver@evaluna.com", role: "driver" },
	{ name: "Marketing Exec", email: "marketing@evaluna.com", role: "marketing" },
	{ name: "Biller Desk", email: "biller@evaluna.com", role: "biller" },
	{ name: "Warehouse Checker", email: "checker@evaluna.com", role: "checker" },
	{ name: "Warehouse Packer", email: "packer@evaluna.com", role: "packer" },
];

async function main() {
	const password = "Password@123";
	console.log("🚀 Starting user seeding directly to Database...");

	for (const u of USERS_TO_SEED) {
		try {
			// Check if user already exists
			const existing = await db
				.select({ id: user.id })
				.from(user)
				.where(eq(user.email, u.email))
				.limit(1);

			if (existing.length === 0) {
				console.log(`Creating user: ${u.name} (${u.email}) with role: ${u.role}...`);
				const result = await auth.api.signUpEmail({
					body: {
						email: u.email,
						password: password,
						name: u.name,
					},
				});

				if (result) {
					// Update role to correct one
					await db
						.update(user)
						.set({ role: u.role } as any)
						.where(eq(user.email, u.email));
					console.log(`✅ Successfully created and updated role for ${u.email}`);
				}
			} else {
				// User exists, make sure role is correct
				await db
					.update(user)
					.set({ role: u.role } as any)
					.where(eq(user.email, u.email));
				console.log(`ℹ️ User ${u.email} already exists. Updated role to: ${u.role}`);
			}
		} catch (error: any) {
			console.error(`❌ Failed to seed user ${u.email}:`, error?.message || error);
		}
	}
	
	console.log("🎉 Seeding complete!");
	process.exit(0);
}

main();
