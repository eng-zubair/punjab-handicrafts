# Production Database Seeding Instructions

This document explains how to populate your production database with initial data after publishing your Sanatzar application.

## Overview

The application includes a secure `/api/admin/seed` endpoint that initializes your production database with:
- **9 Districts/GI Brands**: Lahore Heritage Crafts, Punjab Metal & Leather Works, Pothohari Crafts, Sufi Craft Collection, Faisalabadi Weaves, Saraiki Tribal Arts, Cholistani Heritage, Salt & Stone Crafts, and Multani Crafts
- **3 Sample Vendors**: Vendor accounts for Lahore, Multan, and Bahawalpur
- **3 Sample Stores**: Approved stores with authentic GI brand associations
- **8 Sample Products**: High-quality handicraft products with real images

## Prerequisites

1. Your application must be published on Replit
2. You must have the `SEED_SECRET` environment variable set in production (same value you configured in development)

## How to Seed Production Database

### Step 1: Ensure SEED_SECRET is Set in Production

1. Go to your published Replit project
2. Navigate to Secrets (in the Tools panel)
3. Verify that `SEED_SECRET` exists with the same value you used in development
4. If not present, add it now

### Step 2: Call the Seed Endpoint

Use `curl` or any HTTP client to send a POST request to your production API:

```bash
curl -X POST https://your-app-name.replit.app/api/admin/seed \
  -H "Authorization: Bearer YOUR_SEED_SECRET_VALUE"
```

Replace:
- `your-app-name.replit.app` with your actual published domain
- `YOUR_SEED_SECRET_VALUE` with your actual SEED_SECRET value

### Step 3: Verify Success

**Successful Response:**
```json
{
  "success": true,
  "message": "Database seeded successfully"
}
```

**Failed Response (Invalid Token):**
```json
{
  "message": "Unauthorized - Invalid seed token"
}
```

**Failed Response (Seed Error):**
```json
{
  "success": false,
  "message": "Failed to seed database",
  "error": "Error details here"
}
```

### Step 4: Verify Data in Your Application

1. Visit your published application homepage
2. You should see products displayed in the hero section
3. Browse to the Products page to see all seeded products
4. Check that districts and GI brands are available in filters

## What Gets Seeded

### Districts & GI Brands (Categories)
- Lahore - Lahore Heritage Crafts
- Gujranwala - Punjab Metal & Leather Works
- Rawalpindi - Pothohari Crafts
- Sahiwal - Sufi Craft Collection
- Faisalabad - Faisalabadi Weaves
- D.G. Khan - Saraiki Tribal Arts
- Bahawalpur - Cholistani Heritage
- Sargodha - Salt & Stone Crafts
- Multan - Multani Crafts

### Sample Vendors
1. Ahmad Hassan (vendor1@sanatzar.pk) - Lahore
2. Fatima Ali (vendor2@sanatzar.pk) - Multan
3. Zainab Khan (vendor3@sanatzar.pk) - Bahawalpur

### Sample Stores
1. Lahore Heritage Emporium (Approved)
2. Multan Artisan Collective (Approved)
3. Bahawalpur Craft House (Approved)

### Sample Products
8 authentic handicraft products including:
- Handcrafted Kundan Jewelry Set (Lahore)
- Traditional Gota Embroidered Dupatta (Lahore)
- Multani Blue Pottery Vase (Multan)
- Handmade Multani Khussa (Multan)
- Blue Pottery Decorative Plate (Multan)
- Authentic Ralli Quilt (Bahawalpur)
- Handmade Mukesh Embroidered Shawl (Bahawalpur)
- Traditional Gotta Work Clutch (Bahawalpur)

## Important Notes

### Running Multiple Times
- The seed script clears existing products before creating new ones
- Categories, vendors, and stores are only created if they don't already exist
- **Be careful**: Running the seed will delete all existing products

### Security
- Never share your `SEED_SECRET` publicly
- Only run this endpoint once after initial deployment
- Consider removing or disabling the endpoint after seeding if not needed

### Production Database Safety
- The seed script only modifies development database when run locally
- When called via `/api/admin/seed`, it uses your production DATABASE_URL
- Always backup your production data before running administrative scripts

## Troubleshooting

### "Unauthorized - Invalid seed token"
- Verify your SEED_SECRET is correctly set in production environment
- Ensure you're using `Bearer ` prefix in Authorization header
- Check that you copied the complete secret value without extra spaces

### "Failed to seed database"
- Check the error message in the response for specific details
- Verify your production database is accessible and healthy
- Check application logs in Replit for more detailed error information

### Products Not Showing
- Confirm seed response was successful
- Check that product images are accessible (they should be included in your deployment)
- Verify the `/api/products` endpoint returns data
- Check browser console for any JavaScript errors

## Alternative: Manual Database Seeding

If you prefer to manually populate the database using SQL:

1. Go to Replit's Database tool
2. Select "My Data" tab
3. Click "SQL runner"
4. Run your INSERT statements manually

However, using the `/api/admin/seed` endpoint is recommended as it ensures data consistency and includes all necessary relationships.
