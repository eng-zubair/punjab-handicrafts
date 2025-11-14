import bcrypt from "bcrypt";
import { storage } from "./storage";
import { log } from "./vite";

const SALT_ROUNDS = 12;

export async function initializeDefaultAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@sanatzar.pk";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";

  try {
    const existingAdmin = await storage.getUserByEmail(adminEmail);

    if (existingAdmin) {
      log(`Default admin already exists: ${adminEmail}`);
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

    log(`✓ Default admin created successfully`);
    log(`  Email: ${adminEmail}`);
    log(`  Password: ${adminPassword}`);
    log(`  Note: Change these credentials in production!`);
  } catch (error) {
    log(`Error initializing default admin: ${error}`);
  }
}
