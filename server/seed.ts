import { storage } from "./storage";

const districts = [
  {
    district: "Lahore",
    giBrand: "Lahore Heritage Crafts",
    crafts: ["Adda Work", "Handmade Jewelry", "Dough Work", "Raisin Art"],
  },
  {
    district: "Gujranwala",
    giBrand: "Punjab Metal & Leather Works",
    crafts: ["Textile", "Ceramics", "Rugs", "Sports Goods", "Leather", "Hand Embroidery"],
  },
  {
    district: "Rawalpindi",
    giBrand: "Pothohari Crafts",
    crafts: ["Phulkari"],
  },
  {
    district: "Sahiwal",
    giBrand: "Sufi Craft Collection",
    crafts: ["Tarkashi", "Bedsheets"],
  },
  {
    district: "Faisalabad",
    giBrand: "Faisalabadi Weaves",
    crafts: ["Textile", "Tarkashi", "Khaddar", "Bedsheets", "Wood Crafts"],
  },
  {
    district: "D.G. Khan",
    giBrand: "Saraiki Tribal Arts",
    crafts: ["Hand Embroidery", "Machine Embroidery"],
  },
  {
    district: "Bahawalpur",
    giBrand: "Cholistani Heritage",
    crafts: ["Mukesh", "Chunri", "Ralli", "Handmade Jewelry", "Gotta Work"],
  },
  {
    district: "Sargodha",
    giBrand: "Salt & Stone Crafts",
    crafts: ["Truck Art", "Tarkashi", "Hand Embroidery"],
  },
  {
    district: "Multan",
    giBrand: "Multani Crafts",
    crafts: ["Block Printing", "Ajrak", "Camel Skin Lamps", "Blue Pottery", "Khussa"],
  },
];

async function seed() {
  console.log("Starting database seed...");

  try {
    // Seed categories/districts
    for (const districtData of districts) {
      const existing = await storage.getCategoryByDistrict(districtData.district);
      if (!existing) {
        await storage.createCategory(districtData);
        console.log(`Created category for ${districtData.district}`);
      }
    }

    // Create sample users (vendors)
    const vendor1Id = "vendor-1-lahore";
    const vendor2Id = "vendor-2-multan";
    const vendor3Id = "vendor-3-bahawalpur";
    
    const existingVendor1 = await storage.getUser(vendor1Id);
    if (!existingVendor1) {
      await storage.upsertUser({
        id: vendor1Id,
        email: "vendor1@sanatzar.pk",
        firstName: "Ahmad",
        lastName: "Hassan",
        role: "vendor",
      });
      console.log("Created vendor 1");
    }

    const existingVendor2 = await storage.getUser(vendor2Id);
    if (!existingVendor2) {
      await storage.upsertUser({
        id: vendor2Id,
        email: "vendor2@sanatzar.pk",
        firstName: "Fatima",
        lastName: "Ali",
        role: "vendor",
      });
      console.log("Created vendor 2");
    }

    const existingVendor3 = await storage.getUser(vendor3Id);
    if (!existingVendor3) {
      await storage.upsertUser({
        id: vendor3Id,
        email: "vendor3@sanatzar.pk",
        firstName: "Zainab",
        lastName: "Khan",
        role: "vendor",
      });
      console.log("Created vendor 3");
    }

    // Create sample stores
    const store1Id = "store-1-lahore";
    const store2Id = "store-2-multan";
    const store3Id = "store-3-bahawalpur";

    const existingStore1 = await storage.getStore(store1Id);
    if (!existingStore1) {
      await storage.createStore({
        id: store1Id,
        vendorId: vendor1Id,
        name: "Lahore Heritage Emporium",
        description: "Authentic handcrafted jewelry and embroidery from Lahore's master artisans",
        district: "Lahore",
        giBrands: ["Lahore Heritage Crafts"],
        status: "approved",
      });
      console.log("Created store 1");
    }

    const existingStore2 = await storage.getStore(store2Id);
    if (!existingStore2) {
      await storage.createStore({
        id: store2Id,
        vendorId: vendor2Id,
        name: "Multani Blue Pottery House",
        description: "Traditional blue pottery and khussa footwear crafted with generations of expertise",
        district: "Multan",
        giBrands: ["Multani Crafts"],
        status: "approved",
      });
      console.log("Created store 2");
    }

    const existingStore3 = await storage.getStore(store3Id);
    if (!existingStore3) {
      await storage.createStore({
        id: store3Id,
        vendorId: vendor3Id,
        name: "Cholistani Ralli Crafts",
        description: "Beautiful Ralli quilts and traditional embroidery from Bahawalpur",
        district: "Bahawalpur",
        giBrands: ["Cholistani Heritage"],
        status: "approved",
      });
      console.log("Created store 3");
    }

    // Create sample products with actual image paths
    const products = [
      {
        storeId: store1Id,
        title: "Handcrafted Kundan Jewelry Set",
        description: "Exquisite Kundan jewelry set featuring traditional Lahori craftsmanship with intricate detailing",
        price: "8500",
        stock: 12,
        images: ["/attached_assets/generated_images/Lahore_jewelry_and_embroidery_39a642f1.png"],
        district: "Lahore",
        giBrand: "Lahore Heritage Crafts",
        status: "approved",
      },
      {
        storeId: store1Id,
        title: "Traditional Gota Embroidered Dupatta",
        description: "Elegant dupatta with authentic Lahore gota work and delicate embroidery",
        price: "4200",
        stock: 25,
        images: ["/attached_assets/generated_images/Lahore_jewelry_and_embroidery_39a642f1.png"],
        district: "Lahore",
        giBrand: "Lahore Heritage Crafts",
        status: "approved",
      },
      {
        storeId: store2Id,
        title: "Multani Blue Pottery Vase",
        description: "Hand-painted blue pottery vase showcasing the iconic Multani blue glaze technique",
        price: "3500",
        stock: 18,
        images: ["/attached_assets/generated_images/Multan_blue_pottery_workshop_21555b73.png"],
        district: "Multan",
        giBrand: "Multani Crafts",
        status: "approved",
      },
      {
        storeId: store2Id,
        title: "Handmade Multani Khussa",
        description: "Traditional leather khussa footwear with intricate embroidery and authentic Multani design",
        price: "2800",
        stock: 30,
        images: ["/attached_assets/generated_images/Handmade_khussa_footwear_product_06baa0d0.png"],
        district: "Multan",
        giBrand: "Multani Crafts",
        status: "approved",
      },
      {
        storeId: store2Id,
        title: "Blue Pottery Decorative Plate",
        description: "Large decorative plate with traditional Multani blue pottery patterns",
        price: "4500",
        stock: 15,
        images: ["/attached_assets/generated_images/Multan_blue_pottery_workshop_21555b73.png"],
        district: "Multan",
        giBrand: "Multani Crafts",
        status: "approved",
      },
      {
        storeId: store3Id,
        title: "Authentic Ralli Quilt - Queen Size",
        description: "Beautiful handcrafted Ralli quilt featuring traditional Bahawalpur patterns and vibrant colors",
        price: "12000",
        stock: 8,
        images: ["/attached_assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png"],
        district: "Bahawalpur",
        giBrand: "Cholistani Heritage",
        status: "approved",
      },
      {
        storeId: store3Id,
        title: "Handmade Mukesh Embroidered Shawl",
        description: "Luxurious shawl with traditional Mukesh embroidery from Bahawalpur artisans",
        price: "6500",
        stock: 14,
        images: ["/attached_assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png"],
        district: "Bahawalpur",
        giBrand: "Cholistani Heritage",
        status: "approved",
      },
      {
        storeId: store3Id,
        title: "Traditional Gotta Work Clutch",
        description: "Elegant clutch bag featuring authentic Bahawalpur Gotta work with mirror embellishments",
        price: "1800",
        stock: 22,
        images: ["/attached_assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png"],
        district: "Bahawalpur",
        giBrand: "Cholistani Heritage",
        status: "approved",
      },
    ];

    // Clear existing products to ensure fresh seed data
    const allProducts = await storage.getAllProducts({});
    for (const product of allProducts.products) {
      await storage.deleteProduct(product.id);
    }
    console.log(`Cleared ${allProducts.products.length} existing products`);

    // Create new products
    for (const product of products) {
      await storage.createProduct(product);
      console.log(`Created product: ${product.title}`);
    }

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
