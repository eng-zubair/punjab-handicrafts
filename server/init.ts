import bcrypt from "bcrypt";
import { storage } from "./storage";
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
