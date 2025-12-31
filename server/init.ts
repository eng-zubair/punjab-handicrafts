import bcrypt from "bcrypt";
import { storage } from "./storage";
import { pool } from "./db";
import { log } from "./vite";

const SALT_ROUNDS = 12;

export async function ensureDbExtensions() {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    log(`✓ Database extensions verified`);
  } catch (error) {
    log(`✗ Error ensuring database extensions: ${error}`);
  }
}

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

export async function initializeTrainingSchema() {
  try {
    const statements = [
      `CREATE TABLE IF NOT EXISTS training_centers (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text,
        district text NOT NULL,
        address text,
        contact_phone varchar,
        contact_email varchar,
        capacity integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS training_programs (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        center_id varchar NOT NULL REFERENCES training_centers(id),
        title text NOT NULL,
        description text,
        duration_weeks integer NOT NULL DEFAULT 0,
        schedule text,
        required_materials jsonb,
        certification_details text,
        status text NOT NULL DEFAULT 'active',
        created_at timestamp NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS trainee_applications (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id),
        program_id varchar NOT NULL REFERENCES training_programs(id),
        status text NOT NULL DEFAULT 'applied',
        motivation text,
        experience text,
        created_at timestamp NOT NULL DEFAULT now(),
        accepted_at timestamp,
        enrolled_at timestamp,
        completed_at timestamp
      )`,
      `CREATE TABLE IF NOT EXISTS trainee_progress (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id varchar NOT NULL REFERENCES trainee_applications(id) ON DELETE CASCADE,
        milestones jsonb,
        completion_percent integer NOT NULL DEFAULT 0,
        attendance_percent integer NOT NULL DEFAULT 0,
        grade text,
        updated_at timestamp NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS artisan_work (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_id varchar NOT NULL REFERENCES users(id),
        center_id varchar REFERENCES training_centers(id),
        program_id varchar REFERENCES training_programs(id),
        title text NOT NULL,
        description text,
        amount numeric(10,2) NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        payout_id varchar REFERENCES payouts(id),
        assigned_at timestamp NOT NULL DEFAULT now(),
        completed_at timestamp,
        approved_at timestamp
      )`
    ];
    for (const s of statements) {
      await pool.query(s);
    }
    log(`✓ Training schema verified`);
  } catch (error) {
    log(`✗ Error verifying training schema: ${error}`);
  }
}
