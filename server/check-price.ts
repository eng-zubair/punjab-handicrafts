
import { db } from "./db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const [p] = await db.select().from(products).where(eq(products.title, "Test Product 3"));
  if (p) {
    console.log(`Product Price: ${p.price}`);
  } else {
    console.log("Product not found");
  }
  process.exit(0);
}

main().catch(console.error);
