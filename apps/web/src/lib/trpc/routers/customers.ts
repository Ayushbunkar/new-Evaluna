import { customerLedger, customers, orders, customerContacts, normalizePhone } from "@evaluna/db/schema";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { roleProcedure, router } from "../init";

const customerSchema = z
	.object({
		id: z.number(),
		customer_code: z.string().nullable(),
		name: z.string(),
		email: z.string().nullable(),
		phone: z.string().nullable(),
		address: z.string().nullable(),
		village: z.string().nullable(),
		status: z.string().nullable(),
		user_uid: z.string(),
		store_credit: z.string().nullable(),
		loyalty_tier: z.string().nullable(),
		loyalty_points: z.number().nullable(),
		tier_override: z.boolean().nullable(),
		marketing_opt_in: z.boolean().nullable(),
		created_at: z.coerce.date().nullable(),
	})
	.passthrough();

export const customersRouter = router({
	list: roleProcedure(["admin", "manager", "auditor", "sales_person"])
		.meta({
			openapi: {
				method: "GET",
				path: "/customers",
				tags: ["Customers"],
				summary: "List all customers",
			},
		})
		.input(z.void())
		.output(z.array(customerSchema))
		.query(async ({ ctx }) => {
			const conditions = [
				or(eq(customers.is_deleted, false), isNull(customers.is_deleted))
			];
			if (ctx.user.branchId) {
				conditions.push(eq(customers.branch_id, ctx.user.branchId));
			}
			return db
				.select()
				.from(customers)
				.where(and(...conditions));
		}),

	getById: roleProcedure(["admin", "manager", "auditor", "sales_person"])
		.meta({
			openapi: {
				method: "GET",
				path: "/customers/{id}",
				tags: ["Customers"],
				summary: "Get customer by ID",
			},
		})
		.input(z.object({ id: z.number() }))
		.output(z.any()) // Using any for complex relation type temporarily
		.query(async ({ ctx, input }) => {
			const customer = await db.query.customers.findFirst({
				where: and(
					eq(customers.id, input.id),
					ctx.user.branchId
						? eq(customers.branch_id, ctx.user.branchId)
						: undefined,
				),
				with: {
					orders: {
						orderBy: [desc(orders.created_at)],
						limit: 50,
					},
					contacts: true,
				},
			});

			const ledger = await db.query.customerLedger.findMany({
				where: eq(customerLedger.customer_id, input.id),
				orderBy: [desc(customerLedger.created_at)],
			});

			if (!customer) {
				return {
					customer: null,
					ledger: [],
				};
			}

			return { customer, ledger };
		}),

	create: roleProcedure(["admin", "manager", "auditor", "sales_person"])
		.meta({
			openapi: {
				method: "POST",
				path: "/customers",
				tags: ["Customers"],
				summary: "Create a customer",
			},
		})
		.input(
			z.object({
				name: z.string().min(1),
				email: z.preprocess(v => (v === "" ? undefined : v), z.string().email().optional()),
				phone: z.string().optional(),
				address: z.string().optional(),
				village: z.string().optional(),
				status: z.enum(["active", "inactive"]).optional(),
				marketing_opt_in: z.boolean().optional(),
			}),
		)
		.output(customerSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const code = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;
				// Accept empty string or undefined — generate a unique placeholder for the DB NOT NULL + UNIQUE constraint
				const emailInput = input.email?.trim();
				const emailToUse = emailInput || null;
				const [data] = await db
					.insert(customers)
					.values({
						...input,
						phone: normalizePhone(input.phone),
						email: emailToUse,
						customer_code: code,
						user_uid: ctx.user.id,
						branch_id: ctx.user.branchId ?? null,
					})
					.returning();
				return data;
			} catch (error: any) {
				if (
					error?.code === "23505" &&
					error?.constraint === "customers_email_unique"
				) {
					throw new Error("A customer with this email already exists.");
				}
				throw new Error(error?.message || "Failed to create customer");
			}
		}),

	update: roleProcedure(["admin", "manager", "auditor", "sales_person"])
		.meta({
			openapi: {
				method: "PATCH",
				path: "/customers/{id}",
				tags: ["Customers"],
				summary: "Update a customer",
			},
		})
		.input(
			z.object({
				id: z.number(),
				name: z.string().min(1).optional(),
				email: z.preprocess(v => (v === "" ? undefined : v), z.string().email().optional()),
				phone: z.string().optional(),
				address: z.string().optional(),
				village: z.string().optional(),
				status: z.enum(["active", "inactive"]).optional(),
				loyalty_tier: z.string().optional(),
				tier_override: z.boolean().optional(),
				marketing_opt_in: z.boolean().optional(),
			}),
		)
		.output(customerSchema)
		.mutation(async ({ ctx, input }) => {
			try {
				const { id, ...data } = input;
				// Only normalize when a phone was actually supplied, so an update
				// that omits phone doesn't overwrite the stored value.
				if (data.phone !== undefined) {
					data.phone = normalizePhone(data.phone);
				}
				const [updated] = await db
					.update(customers)
					.set({ ...data, user_uid: ctx.user.id })
					.where(
						and(
							eq(customers.id, id),
							ctx.user.branchId
								? eq(customers.branch_id, ctx.user.branchId)
								: undefined,
						),
					)
					.returning();
				return updated;
			} catch (error: any) {
				if (
					error?.code === "23505" &&
					error?.constraint === "customers_email_unique"
				) {
					throw new Error("A customer with this email already exists.");
				}
				throw new Error(error?.message || "Failed to update customer");
			}
		}),

	adjustLedger: roleProcedure(["admin", "manager", "auditor", "sales_person"])
		.meta({
			openapi: {
				method: "POST",
				path: "/customers/{id}/ledger",
				tags: ["Customers"],
				summary: "Adjust customer ledger",
			},
		})
		.input(
			z.object({
				id: z.number(),
				type: z.enum(["points", "credit"]),
				amount: z.number(),
				reason: z.string().min(1),
			}),
		)
		.output(z.object({ success: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			const customer = await db.query.customers.findFirst({
				where: and(
					eq(customers.id, input.id),
					ctx.user.branchId
						? eq(customers.branch_id, ctx.user.branchId)
						: undefined,
				),
			});
			if (!customer) throw new Error("Customer not found");

			await db.insert(customerLedger).values({
				customer_id: input.id,
				type: input.type,
				amount: input.amount.toString(),
				reason: input.reason,
			});

			if (input.type === "credit") {
				const newCredit =
					Number.parseFloat(customer.store_credit || "0") + input.amount;
				await db
					.update(customers)
					.set({ store_credit: newCredit.toString() })
					.where(eq(customers.id, input.id));
			} else if (input.type === "points") {
				const newPoints = (customer.loyalty_points || 0) + input.amount;
				await db
					.update(customers)
					.set({ loyalty_points: newPoints })
					.where(eq(customers.id, input.id));
			}

			return { success: true };
		}),

	delete: roleProcedure(["admin", "manager", "auditor", "sales_person"])
		.meta({
			openapi: {
				method: "DELETE",
				path: "/customers/{id}",
				tags: ["Customers"],
				summary: "Delete a customer",
			},
		})
		.input(z.object({ id: z.number() }))
		.output(z.object({ success: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			const conditions = [eq(customers.id, input.id)];
			if (ctx.user.branchId) {
				conditions.push(eq(customers.branch_id, ctx.user.branchId));
			}
			await db
				.update(customers)
				.set({
					is_deleted: true,
					deleted_at: new Date(),
				})
				.where(and(...conditions));
			return { success: true };
		}),
	addContact: roleProcedure(["admin", "manager", "auditor", "sales_person"])
		.input(z.object({
			customer_id: z.number(),
			name: z.string().min(1),
			email: z.string().email().optional().nullable(),
			phone: z.string().optional().nullable(),
			designation: z.string().optional().nullable(),
			is_primary: z.boolean().default(false)
		}))
		.mutation(async ({ ctx, input }) => {
			const [contact] = await db.insert(customerContacts).values({
				customer_id: input.customer_id,
				name: input.name,
				email: input.email,
				phone: input.phone,
				designation: input.designation,
				is_primary: input.is_primary
			}).returning();
			return contact;
		}),

	deleteContact: roleProcedure(["admin", "manager", "auditor", "sales_person"])
		.input(z.object({ id: z.number() }))
		.mutation(async ({ ctx, input }) => {
			await db.delete(customerContacts).where(eq(customerContacts.id, input.id));
			return { success: true };
		}),
});

