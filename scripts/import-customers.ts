import { customers } from "../../packages/db/src/schema";
import { db } from "../web/src/lib/db";
import fs from "fs";
import csv from "csv-parser";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string(),
  phone: z.string(),
  village: z.string(),
});

async function importCustomers() {
  const results: z.infer<typeof customerSchema>[] = [];

  fs.createReadStream("Contacts.csv")
    .pipe(csv())
    .on("data", (data) => {
      try {
        const parsed = customerSchema.parse({
          name: data["Customer Name"],
          phone: data["Contact Number"],
          village: data["Village Name"],
        });
        results.push(parsed);
      } catch (error) {
        console.error("Validation error:", error);
      }
    })
    .on("end", async () => {
      console.log(`Parsed ${results.length} customers`);

      try {
        // Insert customers in batches
        const batchSize = 100;
        for (let i = 0; i < results.length; i += batchSize) {
          const batch = results.slice(i, i + batchSize);
          await db.insert(customers).values(
            batch.map((customer) => ({
              name: customer.name,
              phone: customer.phone,
              village: customer.village,
              customer_code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
              user_uid: "system",
              status: "active",
            }))
          );
          console.log(`Inserted batch ${i / batchSize + 1}`);
        }

        console.log("Customer import completed successfully");
      } catch (error) {
        console.error("Error importing customers:", error);
      }
    });
}

importCustomers().catch(console.error);