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

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
