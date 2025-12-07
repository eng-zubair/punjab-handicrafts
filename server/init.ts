import bcrypt from "bcrypt";
import { storage } from "./storage";
import { pool } from "./db";
import { log } from "./vite";

const SALT_ROUNDS = 12;

export async function initializeDefaultAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    log(`⚠ Admin credentials not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.`);
    return;
  }

  try {
    const existingAdmin = await storage.getUserByEmail(adminEmail);

    if (existingAdmin) {
      log(`✓ Default admin account verified`);
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

    const adminUser = await storage.createUser({
      email: adminEmail,
      passwordHash,
      firstName: "Admin",
      lastName: "User",
    });

    await storage.updateUserRole(adminUser.id, "admin");

    log(`✓ Default admin account created successfully`);
    log(`  Note: Please change the default admin password after first login`);
  } catch (error) {
    log(`✗ Error initializing default admin: ${error}`);
  }
}

export async function initializeOrderSchema() {
  try {
    const statements = [
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone varchar`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferred_communication text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_estimate text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_service text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamp`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_payment_status text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected_at timestamp`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_receipt_id varchar`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamp`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_verification_status text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_verified_at timestamp`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS reactivated_at timestamp`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS reactivated_by text`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone varchar`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS default_shipping_address text`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs jsonb`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS shipping_prefs jsonb`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_exempt boolean DEFAULT false NOT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login timestamp`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_email text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_street text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_apartment text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone varchar`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_province text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_postal_code text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_country text DEFAULT 'Pakistan'`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost numeric(10,2)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS special_instructions text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_same_as_shipping boolean DEFAULT true`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_street text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_apartment text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_city text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_province text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_postal_code text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'Pakistan'`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_details jsonb`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS category text DEFAULT 'general' NOT NULL`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_kg numeric(10,3)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS length_cm numeric(10,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS width_cm numeric(10,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS height_cm numeric(10,2)`,
      `ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_exempt boolean DEFAULT false NOT NULL`,
    ];
    for (const s of statements) {
      await pool.query(s);
    }
    log(`✓ Orders schema verified`);
  } catch (error) {
    log(`✗ Error verifying orders schema: ${error}`);
  }
}
