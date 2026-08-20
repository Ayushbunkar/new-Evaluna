
import { pgTable, serial, integer, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { customers } from "./packages/db/src/core";

export const customerContacts = pgTable("customer_contacts", {
	id: serial("id").primaryKey(),
	customer_id: integer("customer_id")
		.references(() => customers.id)
		.notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }),
	phone: varchar("phone", { length: 50 }),
	designation: varchar("designation", { length: 255 }),
	is_primary: boolean("is_primary").default(false),
	created_at: timestamp("created_at").defaultNow(),
});

