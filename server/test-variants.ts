import 'dotenv/config';
import { db } from "./db";
import { products, stores, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";

async function run() {
  console.log("Starting Variant Test...");

  // 1. Create a dummy user (vendor)
  // Use a random email to avoid conflict
  const email = `test-vendor-${Date.now()}@example.com`;
  const [user] = await db.insert(users).values({
    email,
    passwordHash: "hash",
    firstName: "Test",
    lastName: "Vendor",
    role: "vendor",
    emailVerified: true
  }).returning();
  console.log("User created:", user.id);

  // 2. Create a dummy store
  const [store] = await db.insert(stores).values({
    vendorId: user.id,
    name: "Test Store Variants",
    district: "Multan",
    giBrands: ["Blue Pottery"],
    status: "approved"
  }).returning();
  console.log("Store created:", store.id);

  // 3. Create Product with Variants
  const variantData = [
    { type: "Size", option: "Small", sku: "VAR-S", price: 1000, stock: 10 },
    { type: "Size", option: "Large", sku: "VAR-L", price: 1200, stock: 5 }
  ];

  // Simulate what the route handler does (stringify variants)
  // casting to any because createProduct expects InsertProduct which has variants as string | null
  const productData = {
    storeId: store.id,
    title: "Variant Product",
    description: "Testing variants",
    price: 1000, // Base price
    stock: 15,   // Total stock
    district: "Multan",
    giBrand: "Blue Pottery",
    category: "Pottery",
    images: ["img1.jpg"],
    hasVariants: true,
    variants: JSON.stringify(variantData)
  };

  const createdProduct = await storage.createProduct(productData as any);
  console.log("Product created:", createdProduct.id);

  // 4. Fetch Product and Verify Variants
  const fetchedProduct = await storage.getProduct(createdProduct.id);
  
  if (!fetchedProduct) {
    console.error("Failed to fetch product");
    process.exit(1);
  }

  console.log("Fetched Category:", fetchedProduct.category);
  console.log("Fetched Variants (Raw):", fetchedProduct.variants);

  let parsedVariants;
  try {
    parsedVariants = JSON.parse(fetchedProduct.variants as string);
  } catch (e) {
    console.error("Failed to parse variants JSON");
  }

  let success = true;
  if (fetchedProduct.category !== "Pottery") {
    console.error("FAILURE: Category mismatch. Expected 'Pottery', got", fetchedProduct.category);
    success = false;
  }

  if (Array.isArray(parsedVariants) && parsedVariants.length === 2) {
    console.log("Variants parsed successfully.");
    if (parsedVariants[0].sku === "VAR-S" && parsedVariants[1].sku === "VAR-L") {
       console.log("Variants content verified.");
    } else {
       console.error("FAILURE: Variants content mismatch");
       success = false;
    }
  } else {
    console.error("FAILURE: Variants mismatch");
    console.log("Expected length 2, got", parsedVariants?.length);
    success = false;
  }

  if (success) {
    console.log("SUCCESS: All checks passed!");
  }

  // Cleanup
  await storage.deleteProduct(createdProduct.id);
  await db.delete(stores).where(eq(stores.id, store.id));
  await db.delete(users).where(eq(users.id, user.id));
  console.log("Cleanup done.");
  process.exit(success ? 0 : 1);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
