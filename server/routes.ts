import type { Express, RequestHandler } from "express";
import express from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { reviews, users, taxRules, shippingRateRules, platformSettings, configAudits, productVariants, sanatzarCenters, trainingPrograms, trainingApplications, registeredArtisans, surveyQuestions, categories, artisanWork, products, newsletterSubscriptions, newsletterSignupSchema } from "@shared/schema";
import { db, pool } from "./db";
import { sql, and, eq, inArray, desc, or } from "drizzle-orm";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import { log } from "./vite";
import { computeTax, type TaxItem } from "./tax";
import { verifyPassword } from "./auth";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import {
  insertStoreSchema,
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertMessageSchema,
  insertPayoutSchema,
  insertProductGroupSchema,
  insertOfferSchema,
  insertTrainingCenterSchema,
  insertTrainingProgramSchema,
  insertTraineeApplicationSchema,
  insertTraineeProgressSchema,
  variantSchema,
  registerSchema,
  loginSchema,
  type User,
} from "@shared/schema";

// Helper function to remove sensitive fields from user objects
function sanitizeUser(user: User) {
  const { passwordHash, verificationToken, passwordResetToken, passwordResetExpires, ...safeUser } = user;
  return safeUser;
}

// Helper function to serialize product prices to strings for API responses
function serializeProduct<T extends { price: number | string }>(product: T): T & { price: string } {
  return {
    ...product,
    price: String(product.price),
  };
}

const isVendor: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    if (!user || (user.role !== "vendor" && user.role !== "admin")) {
      return res.status(403).json({ message: "Vendor access required" });
    }
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error("Error in isVendor middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const isAdmin: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error("Error in isAdmin middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const isTrainee: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    if (!user || user.role !== "trainee") {
      return res.status(403).json({ message: "Trainee access required" });
    }
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error("Error in isTrainee middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const isArtisan: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = await storage.getUser(userId);
    if (!user || user.role !== "artisan") {
      return res.status(403).json({ message: "Artisan access required" });
    }
    req.userRole = user.role;
    next();
  } catch (error) {
    console.error("Error in isArtisan middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Configure multer for secure file uploads
const uploadStorage = multer.diskStorage({
  destination: async (req: any, file, cb) => {
    try {
      // Get store ID from request body or query
      const storeId = req.body.storeId || req.query.storeId;
      if (!storeId) {
        return cb(new Error("Store ID is required"), "");
      }

      // Create directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), "uploads", "product-images", storeId);
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, "");
    }
  },
  filename: (req, file, cb) => {
    // Sanitize filename: timestamp + random string + safe extension
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = `${timestamp}-${randomStr}${ext}`;
    cb(null, sanitizedName);
  },
});

// File filter for security
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Only allow specific image MIME types
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
  }
};

const upload = multer({
  storage: uploadStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 5, // Max 5 files per upload
  },
});

const verificationStorage = multer.diskStorage({
  destination: async (req: any, file, cb) => {
    try {
      const storeId = req.query.storeId;
      if (!storeId) {
        return cb(new Error("Store ID is required in query string"), "");
      }
      const uploadDir = path.join(process.cwd(), "uploads", "verification", storeId);
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, "");
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = `${timestamp}-${randomStr}${ext}`;
    cb(null, sanitizedName);
  },
});

const verificationFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP images and PDF documents are allowed'));
  }
};

const uploadVerification = multer({
  storage: verificationStorage,
  fileFilter: verificationFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Registering routes...');
  try {
    await ensureVariantSchema();
  } catch { }

  app.get('/api/ping-test', (req, res) => {
    console.log('Ping test hit');
    res.send('pong');
  });

  let orderSchemaEnsured = false;
  async function ensureOrderSchema() {
    if (orderSchemaEnsured) return;
    const statements = [
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone varchar`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_province text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost numeric(10,2)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2)`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_details jsonb`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferred_communication text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_estimate text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_service text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamp`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_payment_status text`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_collected_at timestamp`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_receipt_id varchar`,
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason text`,
    ];
    try {
      for (const sqlText of statements) {
        await pool.query(sqlText);
      }
      orderSchemaEnsured = true;
    } catch (e) {
      console.error('ensureOrderSchema error:', e);
    }
  }
  let variantSchemaEnsured = false;
  async function ensureVariantSchema() {
    if (variantSchemaEnsured) return;
    const stmts = [
      `CREATE TABLE IF NOT EXISTS product_variants (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id varchar NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name text NOT NULL,
        sku varchar UNIQUE NOT NULL,
        attributes jsonb NOT NULL,
        price numeric(10,2) NOT NULL,
        stock integer NOT NULL DEFAULT 0,
        barcode varchar,
        weight_kg numeric(10,3),
        length_cm numeric(10,2),
        width_cm numeric(10,2),
        height_cm numeric(10,2),
        images text[],
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS IDX_variant_product ON product_variants(product_id)`,
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS name text`,
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS barcode varchar`,
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS weight_kg numeric(10,3)`,
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS length_cm numeric(10,2)`,
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS width_cm numeric(10,2)`,
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS height_cm numeric(10,2)`,
      `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS images text[]`,
      `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_sku varchar`,
      `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_attributes jsonb`
    ];
    try {
      for (const s of stmts) {
        await pool.query(s);
      }
      variantSchemaEnsured = true;
    } catch (e) {
      console.error('ensureVariantSchema error:', e);
    }
  }
  let taxShipSchemaEnsured = false;
  async function ensureTaxShipSchema() {
    if (taxShipSchemaEnsured) return;
    try {
      const stmts = [
        `CREATE TABLE IF NOT EXISTS platform_settings (
          id varchar PRIMARY KEY DEFAULT 'default',
          tax_enabled boolean NOT NULL DEFAULT true,
          shipping_enabled boolean NOT NULL DEFAULT true,
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS tax_rules (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          enabled boolean NOT NULL DEFAULT true,
          category text,
          province text,
          rate numeric(5,2) NOT NULL,
          exempt boolean NOT NULL DEFAULT false,
          priority integer NOT NULL DEFAULT 0,
          created_by varchar REFERENCES users(id),
          created_at timestamp DEFAULT now() NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS shipping_rate_rules (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          enabled boolean NOT NULL DEFAULT true,
          carrier text NOT NULL DEFAULT 'internal',
          method text NOT NULL DEFAULT 'standard',
          zone text NOT NULL DEFAULT 'PK',
          min_weight_kg numeric(10,3) NOT NULL DEFAULT 0,
          max_weight_kg numeric(10,3) NOT NULL DEFAULT 999,
          base_rate numeric(10,2) NOT NULL DEFAULT 0,
          per_kg_rate numeric(10,2) NOT NULL DEFAULT 0,
          dimensional_factor numeric(10,3),
          surcharge numeric(10,2),
          priority integer NOT NULL DEFAULT 0,
          created_by varchar REFERENCES users(id),
          created_at timestamp DEFAULT now() NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS config_audits (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type text NOT NULL,
          entity_id varchar NOT NULL,
          action text NOT NULL,
          changes jsonb,
          changed_by varchar REFERENCES users(id),
          created_at timestamp DEFAULT now() NOT NULL
        )`,
      ];
      for (const s of stmts) {
        await pool.query(s);
      }
      taxShipSchemaEnsured = true;
      try {
        const rows = await db.select().from(platformSettings);
        if (rows.length === 0) {
          await db.insert(platformSettings).values({ id: 'default', taxEnabled: true, shippingEnabled: true });
        }
      } catch { }
    } catch (e) {
      console.error('ensureTaxShipSchema error:', e);
    }
  }

  let productCategoriesSchemaEnsured = false;
  async function ensureProductCategoriesSchema() {
    if (productCategoriesSchemaEnsured) return;
    try {
      const stmt = `CREATE TABLE IF NOT EXISTS product_categories (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        slug text NOT NULL UNIQUE,
        description text,
        created_at timestamp DEFAULT now() NOT NULL
      )`;
      await pool.query(stmt);
      productCategoriesSchemaEnsured = true;
    } catch (e) {
      console.error('ensureProductCategoriesSchema error:', e);
    }
  }

  function detectProvince(address?: string): string | undefined {
    if (!address) return undefined;
    const a = address.toLowerCase();
    const provinces = [
      { key: 'punjab', name: 'Punjab' },
      { key: 'islamabad', name: 'Islamabad' },
      { key: 'ict', name: 'Islamabad' },
      { key: 'khyber', name: 'Khyber Pakhtunkhwa' },
      { key: 'kpk', name: 'Khyber Pakhtunkhwa' },
      { key: 'kp', name: 'Khyber Pakhtunkhwa' },
      { key: 'sindh', name: 'Sindh' },
      { key: 'balochistan', name: 'Balochistan' },
      { key: 'gb', name: 'Gilgit-Baltistan' },
      { key: 'gilgit', name: 'Gilgit-Baltistan' },
      { key: 'ajk', name: 'Azad Kashmir' },
      { key: 'kashmir', name: 'Azad Kashmir' },
    ];
    for (const p of provinces) {
      if (a.includes(p.key)) return p.name;
    }
    return undefined;
  }



  async function computeShipping(items: Array<{ productId: string; quantity: number; price: string; weightKg?: number; lengthCm?: number; widthCm?: number; heightCm?: number }>, province: string | undefined, shippingMethod?: string): Promise<{ amount: number; breakdown: Array<{ productId: string; weightKg: number }>; carrier: string }> {
    const settingsRows = await db.select().from(platformSettings);
    const shippingEnabled = settingsRows.length === 0 ? true : !!settingsRows[0].shippingEnabled;
    if (!shippingEnabled) return { amount: 0, breakdown: items.map(it => ({ productId: it.productId, weightKg: 0 })), carrier: 'internal' };

    const method = (shippingMethod || 'standard').toLowerCase();
    const zone = 'PK';
    const rules = await db.select().from(shippingRateRules);
    const active = rules.filter(r => r.enabled).filter(r => String(r.method).toLowerCase() === method).filter(r => String(r.zone).toUpperCase() === zone).sort((a: any, b: any) => (Number(b.priority || 0) - Number(a.priority || 0)));

    let totalWeight = 0;
    const breakdown: Array<{ productId: string; weightKg: number }> = [];
    for (const it of items) {
      const w = parseFloat(String(it.weightKg ?? 0)) * Number(it.quantity);
      let dimWeight = 0;
      if (it.lengthCm && it.widthCm && it.heightCm) {
        const volCm = parseFloat(String(it.lengthCm)) * parseFloat(String(it.widthCm)) * parseFloat(String(it.heightCm));
        const factor = parseFloat(String((active[0] as any)?.dimensionalFactor ?? 0)) || 0;
        if (factor > 0) dimWeight = volCm / factor;
      }
      const effectiveWeight = Math.max(w, dimWeight);
      totalWeight += effectiveWeight;
      breakdown.push({ productId: it.productId, weightKg: parseFloat(effectiveWeight.toFixed(3)) });
    }

    const rule = active.find(r => totalWeight >= parseFloat(String(r.minWeightKg)) && totalWeight <= parseFloat(String(r.maxWeightKg))) || active[0];
    if (!rule) return { amount: 0, breakdown, carrier: 'internal' };
    const base = parseFloat(String(rule.baseRate)) || 0;
    const perKg = parseFloat(String(rule.perKgRate)) || 0;
    const surcharge = parseFloat(String(rule.surcharge ?? 0)) || 0;
    const amount = base + perKg * totalWeight + surcharge;
    return { amount: parseFloat(amount.toFixed(2)), breakdown, carrier: String(rule.carrier || 'internal') };
  }
  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Setup Authentication
  await setupAuth(app);

  // Buyer orders listing (Moved to top to ensure registration)
  app.get('/api/buyer/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const orders = await storage.getOrdersByBuyer(userId);
      const out = orders.map(o => ({
        id: o.id,
        buyerId: o.buyerId,
        total: String(o.total),
        status: o.status,
        paymentMethod: (o as any).paymentMethod || null,
        shippingAddress: (o as any).shippingAddress || null,
        createdAt: String(o.createdAt as any),
      }));
      res.json(out);
    } catch (error) {
      console.error('Fetch buyer orders error:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  const rateLimits = new Map<string, { windowStart: number; count: number }>();
  const suggestionCache = new Map<string, { data: Array<{ id: string; title: string; giBrand: string; category: string; district: string; image: string | null }>; expiresAt: number }>();

  app.get('/api/search/suggestions', async (req, res) => {
    const start = Date.now();
    const now = Date.now();
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';

    let rl = rateLimits.get(ip);
    if (!rl || (now - rl.windowStart) >= 60_000) {
      rl = { windowStart: now, count: 0 };
    }
    rl.count += 1;
    rateLimits.set(ip, rl);
    if (rl.count > 100) {
      return res.status(429).json({ message: 'Rate limit exceeded' });
    }

    const qRaw = String(req.query.q ?? '').trim();
    const limit = Math.min(Number(req.query.limit) || 10, 10);
    if (!qRaw) {
      return res.json({ suggestions: [], metrics: { durationMs: Date.now() - start, cached: false } });
    }

    const cacheKey = `${qRaw.toLowerCase()}::${limit}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return res.json({ suggestions: cached.data, metrics: { durationMs: Date.now() - start, cached: true } });
    }

    const approvedActive = and(eq(products.status, 'approved'), eq(products.isActive, true));
    const prefixParam = `${qRaw}%`;
    const containsParam = `%${qRaw}%`;

    let rows = await db
      .select({
        id: products.id,
        title: products.title,
        giBrand: products.giBrand,
        category: products.category,
        district: products.district,
        images: products.images,
      })
      .from(products)
      .where(and(approvedActive, sql`${products.title} ILIKE ${prefixParam}`))
      .orderBy(desc(products.createdAt))
      .limit(limit);

    if (rows.length < limit) {
      const extra = await db
        .select({
          id: products.id,
          title: products.title,
          giBrand: products.giBrand,
          category: products.category,
          district: products.district,
          images: products.images,
        })
        .from(products)
        .where(
          and(
            approvedActive,
            sql`(${products.title} ILIKE ${containsParam} OR ${products.giBrand} ILIKE ${containsParam} OR ${products.category} ILIKE ${containsParam})`,
          ),
        )
        .orderBy(desc(products.createdAt))
        .limit(limit * 2);
      const map = new Map(rows.map(r => [r.id, r]));
      for (const r of extra) {
        if (map.size >= limit) break;
        if (!map.has(r.id)) map.set(r.id, r);
      }
      rows = Array.from(map.values());
    }

    const suggestions = rows.slice(0, limit).map((r: any) => ({
      id: r.id,
      title: r.title,
      giBrand: r.giBrand,
      category: r.category,
      district: r.district,
      image: (r.images && Array.isArray(r.images) && r.images.length > 0) ? r.images[0] : null,
    }));

    suggestionCache.set(cacheKey, { data: suggestions, expiresAt: now + 5 * 60_000 });
    res.json({ suggestions, metrics: { durationMs: Date.now() - start, cached: false } });
  });

  // Fetch last shipping details for auto-fill (Moved to top to ensure registration)
  app.get('/api/buyer/last-shipping-details-v2', isAuthenticated, async (req: any, res) => {
    console.log('Hit /api/buyer/last-shipping-details-v2');
    try {
      const userId = req.userId;
      const orders = await storage.getOrdersByBuyer(userId);
      if (orders.length > 0) {
        const lastOrder = orders[0];
        // Also fetch user email/phone if not in order, but order usually has it
        const user = await storage.getUser(userId);

        res.json({
          recipientName: lastOrder.recipientName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''),
          recipientEmail: lastOrder.recipientEmail || user?.email || '',
          shippingPhone: lastOrder.shippingPhone || user?.phone || '',
          shippingStreet: lastOrder.shippingStreet || '',
          shippingApartment: lastOrder.shippingApartment || '',
          shippingCity: lastOrder.shippingCity || '',
          shippingProvince: lastOrder.shippingProvince || '',
          shippingPostalCode: lastOrder.shippingPostalCode || '',
          shippingCountry: lastOrder.shippingCountry || 'Pakistan',
          shippingAddress: lastOrder.shippingAddress || '',
        });
      } else {
        // Fallback to user profile if no orders
        const user = await storage.getUser(userId);
        res.json({
          recipientName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
          recipientEmail: user?.email || '',
          shippingPhone: user?.phone || '',
          shippingCountry: 'Pakistan',
        });
      }
    } catch (error) {
      console.error('Fetch last shipping details error:', error);
      res.status(500).json({ message: 'Failed to fetch details' });
    }
  });

  // File Upload Routes
  // Note: storeId must be passed as query parameter because multer parses multipart before req.body is available
  app.post('/api/upload/product-images', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      // Get storeId from query string (required before multer parsing)
      const storeId = req.query.storeId;

      if (!storeId) {
        return res.status(400).json({ message: "Store ID is required in query string" });
      }

      // Verify store ownership before allowing upload
      const store = await storage.getStore(storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      if (store.vendorId !== req.userId) {
        return res.status(403).json({ message: "You do not have permission to upload images for this store" });
      }

      // Use multer middleware to handle the upload
      upload.array('images', 5)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size cannot exceed 5MB' });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Cannot upload more than 5 files' });
          }
          return res.status(400).json({ message: err.message });
        } else if (err) {
          return res.status(400).json({ message: err.message });
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ message: 'No files uploaded' });
        }

        // Return public URLs for uploaded files
        // TODO: Consider adding server-side file-type verification and image optimization for production
        const imagePaths = files.map(file => {
          const relativePath = path.relative(process.cwd(), file.path);
          return `/${relativePath.replace(/\\/g, '/')}`;
        });

        res.json({ images: imagePaths });
      });
    } catch (error) {
      console.error("Error uploading product images:", error);
      res.status(500).json({ message: "Failed to upload images" });
    }
  });

  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await hashPassword(validatedData.password);

      // Create user
      const user = await storage.createUser({
        email: validatedData.email,
        passwordHash,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });

      // Log user in automatically
      req.login({ userId: user.id }, (err) => {
        if (err) {
          console.error("Error logging in after registration:", err);
          return res.status(500).json({ message: "Registration successful, but login failed" });
        }

        // Return user without sensitive fields
        res.status(201).json(sanitizeUser(user));
      });
    } catch (error: any) {
      console.error("Error registering user:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      // Validate request body first
      const validatedData = loginSchema.parse(req.body);

      // Replace request body with validated data to prevent injection
      req.body = validatedData;

      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          console.error("Error during login:", err);
          try { log(`auth_login_error email=${(req.body as any)?.email}`); } catch { }
          return res.status(500).json({ message: "Login failed" });
        }

        if (!user) {
          try { log(`auth_login_failed email=${(req.body as any)?.email}`); } catch { }
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }

        req.login(user, async (loginErr) => {
          if (loginErr) {
            console.error("Error establishing session:", loginErr);
            return res.status(500).json({ message: "Login failed" });
          }

          // Fetch full user data
          const fullUser = await storage.getUser(user.userId);
          if (!fullUser) {
            return res.status(404).json({ message: "User not found" });
          }
          try {
            await storage.updateUserLastLogin(fullUser.id, new Date());
          } catch { }

          // Return user without sensitive fields
          try { log(`auth_login_success userId=${fullUser.id} role=${fullUser.role}`); } catch { }
          res.json(sanitizeUser(fullUser));
        });
      })(req, res, next);
    } catch (error: any) {
      console.error("Error in login route:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid login data", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      try { log(`auth_logout userId=${(req.user as any)?.userId || 'unknown'}`); } catch { }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return user without sensitive fields
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Buyer profile endpoints
  app.get('/api/buyer/profile', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error('Fetch buyer profile error:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  app.put('/api/buyer/profile', isAuthenticated, async (req: any, res) => {
    try {
      const { firstName, lastName, phone, defaultShippingAddress, notificationPrefs, shippingPrefs } = req.body || {};
      const current = await storage.getUser(req.userId);
      if (!current) return res.status(404).json({ message: 'User not found' });
      const updated = await storage.upsertUser({
        id: current.id,
        email: current.email,
        firstName: firstName ?? current.firstName,
        lastName: lastName ?? current.lastName,
        phone: phone ?? (current as any).phone ?? null,
        defaultShippingAddress: defaultShippingAddress ?? (current as any).defaultShippingAddress ?? null,
        notificationPrefs: notificationPrefs ?? (current as any).notificationPrefs ?? null,
        shippingPrefs: shippingPrefs ?? (current as any).shippingPrefs ?? null,
        role: current.role,
      } as any);
      res.json(sanitizeUser(updated));
    } catch (error) {
      console.error('Update buyer profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  });

  app.post('/api/buyer/password', isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password required' });
      }
      const user = await storage.getUser(req.userId);
      if (!user || !user.passwordHash) return res.status(404).json({ message: 'User not found' });
      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });
      const hash = await hashPassword(newPassword);
      await storage.updatePassword(user.id, hash);
      res.json({ message: 'Password updated' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  });

  // Buyer profile image upload
  app.post('/api/buyer/profile/upload-image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const dirForUser = path.join(process.cwd(), 'uploads', 'profiles', userId);
      await fs.mkdir(dirForUser, { recursive: true });
      const storageEngine = multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, dirForUser),
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `profile-${Date.now()}${ext}`);
        },
      });
      const u = multer({
        storage: storageEngine,
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
          if (ok) cb(null, true); else cb(new Error('Invalid image type'));
        }
      }).single('image');
      u(req, res, async (err: any) => {
        if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const relativePath = path.relative(process.cwd(), req.file.path);
        const url = `/${relativePath.replace(/\\/g, '/')}`;
        const user = await storage.upsertUser({ id: userId, profileImageUrl: url } as any);
        res.json({ imageUrl: url, user: sanitizeUser(user) });
      });
    } catch (error) {
      console.error('Upload profile image error:', error);
      res.status(500).json({ message: 'Failed to upload image' });
    }
  });

  // Buyer order details with products
  app.get('/api/buyer/orders/:id/details', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const order = await storage.getOrder(req.params.id);
      if (!order || order.buyerId !== userId) return res.status(404).json({ message: 'Order not found' });
      const items = await storage.getOrderItemsWithProductsForOrders([order.id]);
      const list = items[order.id] || [];
      const subtotal = list.reduce((s: number, it: any) => s + parseFloat(String(it.price)) * Number(it.quantity), 0);
      const withItems = {
        ...order,
        total: String(order.total),
        shippingCost: String((order as any).shippingCost ?? 0),
        taxAmount: String((order as any).taxAmount ?? 0),
        shippingMethod: (order as any).shippingMethod || null,
        subtotal: String(subtotal),
        items: list,
      };
      res.json(withItems);
    } catch (error) {
      console.error('Fetch buyer order details error:', error);
      res.status(500).json({ message: 'Failed to fetch order details' });
    }
  });



  // Vendors involved in an order
  app.get('/api/orders/:id/vendors', isAuthenticated, async (req: any, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ message: 'Order not found' });

      const items = await storage.getOrderItems(order.id);
      const storeIds = Array.from(new Set(items.map(i => i.storeId)));
      const vendors: Array<{ storeId: string; storeName?: string; vendorId: string }> = [];

      // Check permissions
      const user = await storage.getUser(req.userId);
      let isAuthorized = false;

      if (user?.role === 'admin' || order.buyerId === req.userId) {
        isAuthorized = true;
      }

      for (const sid of storeIds) {
        const store = await storage.getStore(sid);
        if (store) {
          vendors.push({ storeId: store.id, storeName: store.name, vendorId: store.vendorId });
          // Ensure loose comparison or string coercion just in case
          if (String(store.vendorId) === String(req.userId)) {
            isAuthorized = true;
          }
        }
      }

      if (!isAuthorized) {
        console.log(`[Auth Failure] /api/orders/${req.params.id}/vendors - User: ${req.userId}, Role: ${user?.role}, Buyer: ${order.buyerId}, Vendors in order: ${vendors.map(v => v.vendorId).join(',')}`);
        return res.status(403).json({ message: 'Not authorized' });
      }

      res.json(vendors);
    } catch (error) {
      console.error('Fetch order vendors error:', error);
      res.status(500).json({ message: 'Failed to fetch order vendors' });
    }
  });

  app.post('/api/auth/register-vendor', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === "vendor") {
        return res.status(400).json({ message: "User is already a vendor" });
      }

      const { name, description, district, giBrands } = req.body;

      if (!name || !district || !giBrands || !Array.isArray(giBrands) || giBrands.length === 0) {
        return res.status(400).json({ message: "Store name, district, and at least one GI brand are required" });
      }

      await storage.updateUserRole(userId, "vendor");

      const validatedStoreData = insertStoreSchema.parse({
        vendorId: userId,
        name,
        description: description || "",
        district,
        giBrands,
        status: "pending",
      });

      const store = await storage.createStore(validatedStoreData);
      const updatedUser = await storage.getUser(userId);

      // Return user without sensitive fields
      res.status(201).json({ user: sanitizeUser(updatedUser!), store });
    } catch (error: any) {
      console.error("Error registering vendor:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid store data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register as vendor" });
    }
  });

  // Product browsing routes
  app.get('/api/products', async (req: any, res) => {
    try {
      const { district, giBrand, category, minPrice, maxPrice, search, status, page, pageSize } = req.query;

      const filters: any = {};

      // Status filtering with strict role-based access control
      const userId = req.userId;
      let userRole: string | null = null;

      if (userId) {
        const user = await storage.getUser(userId);
        userRole = user?.role || null;
      }

      // Whitelist of valid status values
      const validStatuses = ['pending', 'approved', 'rejected', 'all'];

      // Only admins can request non-approved products or 'all' products
      // Vendors should use /api/vendor/products to see their own products with any status
      // Regular users and unauthenticated users can only see approved products
      if (userRole === 'admin' && status && validStatuses.includes(status as string)) {
        // Admins can filter by specific status or request 'all'
        if (status !== 'all') {
          filters.status = status as string;
        }
        // If status is 'all', don't add status filter (show everything)
      } else {
        // Everyone else (buyers, vendors via this endpoint, unauthenticated) only sees approved
        filters.status = 'approved';
      }

      // Ensure archived products are hidden from non-admin browsing
      if (userRole !== 'admin') {
        filters.isActive = true;
      }

      if (district) filters.district = district as string;
      if (giBrand) filters.giBrand = giBrand as string;
      if (category) filters.category = category as string;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);
      if (search) filters.search = search as string;
      if (page) filters.page = Number(page);
      if (pageSize) filters.pageSize = Number(pageSize);

      const { products, total } = await storage.getAllProducts(filters);

      const productIds = products.map(p => p.id);
      let statsMap: Record<string, { count: number; avg: number }> = {};
      if (productIds.length > 0) {
        try {
          const rows = await db
            .select({ productId: reviews.productId, count: sql<number>`COUNT(*)`, avg: sql<number>`AVG(${reviews.rating})` })
            .from(reviews)
            .where(and(inArray(reviews.productId, productIds), eq(reviews.status, 'approved')))
            .groupBy(reviews.productId);
          rows.forEach((r: any) => {
            statsMap[r.productId] = { count: Number(r.count || 0), avg: Number(r.avg || 0) };
          });
        } catch { }
      }

      // Serialize product prices and attach rating stats
      const serializedProducts = products.map(p => ({
        ...serializeProduct(p),
        ratingAverage: statsMap[p.id]?.avg ?? 0,
        ratingCount: statsMap[p.id]?.count ?? 0,
      }));

      if (filters.page && filters.pageSize) {
        const totalPages = Math.ceil(total / filters.pageSize);
        res.json({
          products: serializedProducts,
          pagination: {
            page: filters.page,
            pageSize: filters.pageSize,
            total,
            totalPages
          }
        });
      } else {
        res.json({ products: serializedProducts, pagination: { total } });
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      await ensureVariantSchema();
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      const vPage = Number((req.query.variantsPage as string) || 1);
      const vSize = Number((req.query.variantsPageSize as string) || 50);
      const { variants: vRows, total: vTotal } = await storage.getVariantsByProductPaginated(product.id, Math.max(1, vPage), Math.max(1, vSize));
      const variants = vRows.map((v: any) => ({
        type: String(v.attributes?.type || ''),
        option: String(v.attributes?.option || ''),
        name: v.name != null ? String(v.name) : `${String(v.attributes?.type || '')} ${String(v.attributes?.option || '')}`.trim(),
        sku: String(v.sku),
        price: parseFloat(String(v.price)),
        stock: Number(v.stock || 0),
        barcode: v.barcode != null ? String(v.barcode) : undefined,
        weightKg: v.weightKg != null ? parseFloat(String(v.weightKg)) : undefined,
        lengthCm: v.lengthCm != null ? parseFloat(String(v.lengthCm)) : undefined,
        widthCm: v.widthCm != null ? parseFloat(String(v.widthCm)) : undefined,
        heightCm: v.heightCm != null ? parseFloat(String(v.heightCm)) : undefined,
        images: Array.isArray(v.images) ? v.images : [],
      }));
      res.json({ ...serializeProduct(product), variants, variantsPagination: { page: Math.max(1, vPage), pageSize: Math.max(1, vSize), total: vTotal, totalPages: Math.ceil(vTotal / Math.max(1, vSize)) } });
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.get('/api/wishlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const items = await storage.getWishlistItemsByUser(userId);
      res.json(items.map(i => i.productId));
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  app.post('/api/wishlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { productId } = req.body as { productId: string };
      if (!productId) return res.status(400).json({ message: "productId required" });
      await storage.addWishlistItem(userId, productId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      res.status(500).json({ message: "Failed to add to wishlist" });
    }
  });

  app.delete('/api/wishlist/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const productId = req.params.productId as string;
      await storage.removeWishlistItem(userId, productId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ message: "Failed to remove from wishlist" });
    }
  });

  app.post('/api/wishlist/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { productIds } = req.body as { productIds: string[] };
      const ids = Array.isArray(productIds) ? productIds : [];
      for (const pid of ids) {
        if (!pid) continue;
        await storage.addWishlistItem(userId, pid);
      }
      const items = await storage.getWishlistItemsByUser(userId);
      res.json(items.map(i => i.productId));
    } catch (error) {
      console.error("Error syncing wishlist:", error);
      res.status(500).json({ message: "Failed to sync wishlist" });
    }
  });

  app.get('/api/wishlist/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const list = await storage.getWishlistProducts(userId);
      const productIds = list.map(p => p.id);
      let statsMap: Record<string, { count: number; avg: number }> = {};
      if (productIds.length > 0) {
        try {
          const rows = await db
            .select({ productId: reviews.productId, count: sql<number>`COUNT(*)`, avg: sql<number>`AVG(${reviews.rating})` })
            .from(reviews)
            .where(and(inArray(reviews.productId, productIds), eq(reviews.status, 'approved')))
            .groupBy(reviews.productId);
          rows.forEach((r: any) => {
            statsMap[r.productId] = { count: Number(r.count || 0), avg: Number(r.avg || 0) };
          });
        } catch { }
      }
      const serializedProducts = list.map(p => ({
        ...serializeProduct(p),
        ratingAverage: statsMap[p.id]?.avg ?? 0,
        ratingCount: statsMap[p.id]?.count ?? 0,
      }));
      res.json({ products: serializedProducts });
    } catch (error) {
      console.error("Error fetching wishlist products:", error);
      res.status(500).json({ message: "Failed to fetch wishlist products" });
    }
  });

  app.get('/api/products/:id/reviews', async (req, res) => {
    try {
      const productId = req.params.id as string;
      const sort = (req.query.sort as string) || 'newest';
      const list = await storage.getReviewsByProduct(productId, sort as any);
      const approvedList = list.filter((r: any) => r.status === 'approved');
      const userIds = Array.from(new Set(approvedList.map((r: any) => r.userId)));
      let userMap: Record<string, { firstName: string | null; lastName: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        try {
          const rows = await db
            .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
            .from(users)
            .where(inArray(users.id, userIds));
          rows.forEach((u: any) => {
            userMap[u.id] = { firstName: u.firstName ?? null, lastName: u.lastName ?? null, email: u.email ?? null };
          });
        } catch { }
      }
      const withMedia = await Promise.all(approvedList.map(async (r: any) => ({
        ...r,
        media: await storage.getReviewMedia(r.id),
        reviewerName: (() => {
          const u = userMap[r.userId];
          const full = [u?.firstName || '', u?.lastName || ''].join(' ').trim();
          if (full) return full;
          const email = u?.email || '';
          return email ? String(email).split('@')[0] : '';
        })(),
      })));
      const stats = await storage.getReviewStats(productId);
      res.json({ reviews: withMedia, stats });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  app.post('/api/products/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const productId = req.params.id as string;
      const userId = req.userId as string;
      const rating = Number(req.body?.rating);
      const comment = String(req.body?.comment || "").trim();
      // Prevent duplicate reviews per user/product
      const existing = await storage.getReviewsByProduct(productId, 'newest');
      if (existing.some((r: any) => r.userId === userId)) {
        return res.status(400).json({ message: 'You have already reviewed this product' });
      }
      if (!rating || rating < 0.5 || rating > 5 || Math.round(rating * 2) / 2 !== rating) {
        return res.status(400).json({ message: 'Invalid rating' });
      }
      if (comment.length < 20 || comment.length > 500) {
        return res.status(400).json({ message: 'Review must be 20-500 characters' });
      }
      const bad = ["spam", "fake", "scam"];
      const lower = comment.toLowerCase();
      const containsBad = bad.some(w => lower.includes(w));
      const orders = await storage.getOrdersByBuyer(userId);
      const orderIds = orders.map(o => o.id);
      const itemsMap = await storage.getOrderItemsWithProductsForOrders(orderIds);
      let verified = false;
      for (const oid of Object.keys(itemsMap)) {
        const items = itemsMap[oid];
        if (items.some(i => i.productId === productId)) { verified = true; break; }
      }
      const status = containsBad ? 'pending' : 'approved';
      const r = await storage.createReview({ productId, userId, rating: String(rating), comment, verifiedPurchase: verified, status });
      // Notify vendor via internal message
      const product = await storage.getProduct(productId);
      if (product) {
        const store = await storage.getStore(product.storeId);
        if (store) {
          try {
            await storage.createMessage({ senderId: userId, receiverId: store.vendorId, message: `New review on ${product.title}: ${comment.substring(0, 120)}...` });
          } catch { }
        }
      }
      res.json(r);
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Failed to create review' });
    }
  });

  app.post('/api/reviews/:id/vote', isAuthenticated, async (req: any, res) => {
    try {
      const reviewId = req.params.id as string;
      const userId = req.userId as string;
      const v = String(req.body?.value);
      const value = v === 'up' ? 1 : v === 'down' ? -1 : 0;
      if (!value) return res.status(400).json({ message: 'Invalid vote' });
      const result = await storage.upsertReviewVote(reviewId, userId, value as 1 | -1);
      res.json(result);
    } catch (error) {
      console.error('Vote error:', error);
      res.status(500).json({ message: 'Failed to vote' });
    }
  });

  app.post('/api/reviews/:id/media/upload', isAuthenticated, async (req: any, res) => {
    try {
      const reviewId = req.params.id as string;
      const type = (req.query.type as string) || 'image';
      // For simplicity, accept only single file via raw buffer
      const dir = path.join(process.cwd(), 'uploads', 'reviews', reviewId);
      await fs.mkdir(dir, { recursive: true });
      const chunks: Buffer[] = [];
      let size = 0;
      req.on('data', (c: Buffer) => { chunks.push(c); size += c.length; });
      req.on('end', async () => {
        if (size > 10 * 1024 * 1024) { // 10MB limit
          return res.status(400).json({ message: 'File too large (max 10MB)' });
        }
        const ext = type === 'video' ? 'mp4' : 'png';
        const name = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = path.join(dir, name);
        await fs.writeFile(filePath, Buffer.concat(chunks));
        const url = `/uploads/reviews/${reviewId}/${name}`;
        await storage.addReviewMedia(reviewId, url, type);
        res.json({ url });
      });
    } catch (error) {
      console.error('Media upload error:', error);
      res.status(500).json({ message: 'Failed to upload media' });
    }
  });

  // Store routes
  app.get('/api/stores', async (req, res) => {
    try {
      const { status } = req.query;
      const stores = await storage.getAllStores(status as string);
      res.json(stores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ message: "Failed to fetch stores" });
    }
  });

  app.get('/api/stores/:id', async (req, res) => {
    try {
      const store = await storage.getStore(req.params.id);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      res.json(store);
    } catch (error) {
      console.error("Error fetching store:", error);
      res.status(500).json({ message: "Failed to fetch store" });
    }
  });

  app.get('/api/stores/:id/offers/active', async (req, res) => {
    try {
      const storeId = req.params.id as string;
      const list = await storage.getActiveOffersByStore(storeId);
      res.json(list);
    } catch (error) {
      console.error("Error fetching active offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  app.get('/api/stores/:id/products', async (req: any, res) => {
    try {
      const storeId = req.params.id as string;
      const list = await storage.getProductsByStore(storeId);
      const filtered = list
        .filter((p: any) => String(p.status || '').toLowerCase() === 'approved')
        .filter((p: any) => !!p.isActive);

      const productIds = filtered.map(p => p.id);
      let statsMap: Record<string, { count: number; avg: number }> = {};
      if (productIds.length > 0) {
        try {
          const rows = await db
            .select({ productId: reviews.productId, count: sql<number>`COUNT(*)`, avg: sql<number>`AVG(${reviews.rating})` })
            .from(reviews)
            .where(and(inArray(reviews.productId, productIds), eq(reviews.status, 'approved')))
            .groupBy(reviews.productId);
          rows.forEach((r: any) => {
            statsMap[r.productId] = { count: Number(r.count || 0), avg: Number(r.avg || 0) };
          });
        } catch { }
      }

      const serialized = filtered.map(p => ({
        ...serializeProduct(p),
        ratingAverage: statsMap[p.id]?.avg ?? 0,
        ratingCount: statsMap[p.id]?.count ?? 0,
      }));
      res.json(serialized);
    } catch (error) {
      console.error('Error fetching store products:', error);
      res.status(500).json({ message: 'Failed to fetch products for store' });
    }
  });

  // Category routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
      const validated = newsletterSignupSchema.parse(req.body);
      const email = String(validated.email).toLowerCase().trim();
      const [existing] = await db.select().from(newsletterSubscriptions).where(eq(newsletterSubscriptions.email, email));
      if (existing) {
        return res.status(200).json({ message: "Already subscribed" });
      }
      const [created] = await db.insert(newsletterSubscriptions).values({
        email,
        consent: validated.consent ?? true,
        source: "footer",
      }).returning();
      res.status(201).json(created);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid email address" });
      }
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  // Product Category routes
  app.get('/api/product-categories', async (_req, res) => {
    try {
      await ensureProductCategoriesSchema();
      const list = await storage.getAllProductCategories();
      res.json(list);
    } catch (error) {
      console.error('Error fetching product categories:', error);
      res.status(500).json({ message: 'Failed to fetch product categories' });
    }
  });

  app.post('/api/admin/product-categories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await ensureProductCategoriesSchema();
      const { name, description } = req.body || {};
      if (!name || String(name).trim().length === 0) {
        return res.status(400).json({ message: 'Name is required' });
      }
      const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const payload = { name: String(name).trim(), slug: toSlug(String(name)), description: description ? String(description) : null } as any;
      const created = await storage.createProductCategory(payload);
      try {
        await db.insert(configAudits).values({ entityType: 'product_category', entityId: created.id as any, action: 'create', changes: payload, changedBy: req.userId } as any);
      } catch { }
      res.status(201).json(created);
    } catch (error: any) {
      const msg = (error && error.message) || 'Failed to create product category';
      res.status(500).json({ message: msg });
    }
  });

  app.put('/api/admin/product-categories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await ensureProductCategoriesSchema();
      const id = req.params.id as string;
      const { name, description } = req.body || {};
      const updates: any = {};
      if (name != null) {
        const nm = String(name).trim();
        updates.name = nm;
        const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        updates.slug = toSlug(nm);
      }
      if (description != null) updates.description = description ? String(description) : null;
      const updated = await storage.updateProductCategory(id, updates);
      try {
        await db.insert(configAudits).values({ entityType: 'product_category', entityId: id, action: 'update', changes: updates, changedBy: req.userId } as any);
      } catch { }
      res.json(updated);
    } catch (error) {
      console.error('Error updating product category:', error);
      res.status(500).json({ message: 'Failed to update product category' });
    }
  });

  app.delete('/api/admin/product-categories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await ensureProductCategoriesSchema();
      const id = req.params.id as string;
      await storage.deleteProductCategory(id);
      try {
        await db.insert(configAudits).values({ entityType: 'product_category', entityId: id, action: 'delete', changes: null as any, changedBy: req.userId } as any);
      } catch { }
      res.json({ deleted: id });
    } catch (error) {
      console.error('Error deleting product category:', error);
      res.status(500).json({ message: 'Failed to delete product category' });
    }
  });

  app.get('/api/guide/resources', async (_req, res) => {
    const resources = [
      { id: 'getting-started', title: 'Getting Started Guide', description: 'How to set up your store' },
      { id: 'product-listing', title: 'Product Listing Checklist', description: 'Best practices for listings' },
    ];
    res.json(resources);
  });

  app.get('/api/guide/resources/:id/download', async (req, res) => {
    const { id } = req.params as { id: string };
    const content = `Resource: ${id}\n\nThis is a downloadable resource for vendors.`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.txt"`);
    res.send(content);
  });

  app.get('/api/brands/:slug', async (req, res) => {
    try {
      const { slug } = req.params as { slug: string };
      const categories = await storage.getAllCategories();
      const brandSet = new Set(categories.map(c => c.giBrand));
      const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const brandMap = new Map(Array.from(brandSet).map(b => [toSlug(b), b]));
      const brandName = brandMap.get(slug);
      if (!brandName) {
        return res.status(404).json({ message: "Brand not found" });
      }
      const brandCategories = categories.filter(c => c.giBrand === brandName);
      const districts = brandCategories.map(c => c.district);
      const crafts = Array.from(new Set(brandCategories.flatMap(c => c.crafts)));
      const { products } = await storage.getAllProducts({ giBrand: brandName, status: 'approved', page: 1, pageSize: 12 });
      const serializedProducts = products.map(p => ({ ...p, price: String(p.price) }));
      const seoTitle = `${brandName} | Authentic Punjab Handicrafts`;
      const seoDescription = `Discover ${brandName} from ${districts.join(', ')}. Shop authentic crafts from Punjab artisans.`;
      res.json({ name: brandName, slug, districts, crafts, products: serializedProducts, seo: { title: seoTitle, description: seoDescription } });
    } catch (error) {
      console.error("Error fetching brand:", error);
      res.status(500).json({ message: "Failed to fetch brand" });
    }
  });

  app.post('/api/vendor/verification/upload', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const storeId = req.query.storeId;
      if (!storeId) {
        return res.status(400).json({ message: "Store ID is required in query string" });
      }

      const store = await storage.getStore(storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      if (store.vendorId !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ message: "Not authorized to upload documents for this store" });
      }

      uploadVerification.array('files', 10)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size cannot exceed 10MB' });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Cannot upload more than 10 files' });
          }
          return res.status(400).json({ message: err.message });
        } else if (err) {
          return res.status(400).json({ message: err.message });
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ message: 'No files uploaded' });
        }

        const docPaths = files.map(file => {
          const relativePath = path.relative(process.cwd(), file.path);
          return `/${relativePath.replace(/\\/g, '/')}`;
        });
        res.json({ documents: docPaths });
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Upload failed' });
    }
  });

  app.get('/api/vendor/verification/docs', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const storeId = req.query.storeId as string;
      if (!storeId) return res.status(400).json({ message: 'storeId required' });
      const dir = path.join(process.cwd(), 'uploads', 'verification', storeId);
      const exists = await fs
        .access(dir)
        .then(() => true)
        .catch(() => false);
      if (!exists) return res.json([]);
      const files = await fs.readdir(dir);
      const items = files.map((name: string) => ({ name, url: `/uploads/verification/${storeId}/${name}` }));
      res.json(items);
    } catch (error) {
      console.error('Docs list error:', error);
      res.status(500).json({ message: 'Failed to list docs' });
    }
  });

  app.post('/api/vendor/verification/submit', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const { storeId } = req.body as { storeId: string };
      if (!storeId) return res.status(400).json({ message: 'storeId required' });
      await storage.updateStoreStatus(storeId, 'pending');
      res.json({ ok: true });
    } catch (error) {
      console.error('Submit verification error:', error);
      res.status(500).json({ message: 'Failed to submit verification' });
    }
  });

  // Vendor Store Management Routes
  app.post('/api/stores', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const validatedData = insertStoreSchema.parse({
        ...req.body,
        vendorId: req.userId,
      });
      const store = await storage.createStore(validatedData);
      res.status(201).json(store);
    } catch (error: any) {
      console.error("Error creating store:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid store data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create store" });
    }
  });

  app.put('/api/stores/:id', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const storeId = req.params.id;
      const existingStore = await storage.getStore(storeId);

      if (!existingStore) {
        return res.status(404).json({ message: "Store not found" });
      }

      if (existingStore.vendorId !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ message: "Not authorized to update this store" });
      }

      const { vendorId, ...sanitizedUpdates } = insertStoreSchema.partial().parse(req.body);
      const updatedStore = await storage.updateStore(storeId, sanitizedUpdates);
      res.json(updatedStore);
    } catch (error: any) {
      console.error("Error updating store:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid store data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update store" });
    }
  });

  app.get('/api/vendor/stores', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const vendorStores = await storage.getStoresByVendor(req.userId);
      res.json(vendorStores);
    } catch (error) {
      console.error("Error fetching vendor stores:", error);
      res.status(500).json({ message: "Failed to fetch vendor stores" });
    }
  });

  app.get('/api/vendor/offers', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const { storeId, page = 1, pageSize = 24 } = req.query as any;
      if (!storeId) {
        return res.status(400).json({ message: "storeId required" });
      }
      const store = await storage.getStore(String(storeId));
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      if (store.vendorId !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const list = await storage.getOffersByStore(String(storeId));
      const p = Math.max(1, Number(page) || 1);
      const ps = Math.max(1, Math.min(100, Number(pageSize) || 24));
      const start = (p - 1) * ps;
      const slice = list.slice(start, start + ps);
      res.json({ offers: slice, total: list.length });
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ message: "Failed to fetch offers" });
    }
  });

  app.post('/api/vendor/offers', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const payload = req.body || {};
      const storeId = String(payload.storeId || '');
      if (!storeId) return res.status(400).json({ message: "storeId required" });
      const store = await storage.getStore(storeId);
      if (!store) return res.status(404).json({ message: "Store not found" });
      if (store.vendorId !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ message: "Not authorized to create offers for this store" });
      }
      const startAt = payload.startAt ? new Date(payload.startAt) : null;
      const endAt = payload.endAt ? new Date(payload.endAt) : null;
      if (!startAt || !endAt || isNaN(startAt.getTime()) || isNaN(endAt.getTime())) {
        return res.status(400).json({ message: "Invalid start/end times" });
      }
      if (startAt > endAt) {
        return res.status(400).json({ message: "startAt must be before endAt" });
      }
      const validated = insertOfferSchema.parse({
        ...payload,
        scopeProducts: Array.isArray(payload.scopeProducts) ? payload.scopeProducts : undefined,
        scopeCategories: Array.isArray(payload.scopeCategories) ? payload.scopeCategories : undefined,
        scopeVariants: Array.isArray(payload.scopeVariants) ? payload.scopeVariants : undefined,
      });
      const created = await storage.createOffer(validated);
      res.status(201).json(created);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid offer data", errors: error.errors });
      }
      console.error("Error creating offer:", error);
      res.status(500).json({ message: "Failed to create offer" });
    }
  });

  app.patch('/api/vendor/offers/:id', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const id = req.params.id;
      const existing = await storage.getOffer(id);
      if (!existing) return res.status(404).json({ message: "Offer not found" });
      const store = await storage.getStore(existing.storeId);
      if (!store) return res.status(404).json({ message: "Store not found" });
      if (store.vendorId !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      const updates = req.body || {};
      if (updates.startAt && updates.endAt) {
        const startAt = new Date(updates.startAt);
        const endAt = new Date(updates.endAt);
        if (isNaN(startAt.getTime()) || isNaN(endAt.getTime()) || startAt > endAt) {
          return res.status(400).json({ message: "Invalid start/end times" });
        }
      }
      if (updates.scopeProducts && !Array.isArray(updates.scopeProducts)) updates.scopeProducts = undefined;
      if (updates.scopeCategories && !Array.isArray(updates.scopeCategories)) updates.scopeCategories = undefined;
      if (updates.scopeVariants && !Array.isArray(updates.scopeVariants)) updates.scopeVariants = undefined;
      const updated = await storage.updateOffer(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ message: "Failed to update offer" });
    }
  });

  app.delete('/api/vendor/offers/:id', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const id = req.params.id;
      const existing = await storage.getOffer(id);
      if (!existing) return res.status(404).json({ message: "Offer not found" });
      const store = await storage.getStore(existing.storeId);
      if (!store) return res.status(404).json({ message: "Store not found" });
      if (store.vendorId !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteOffer(id);
      res.json({ deleted: id });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Failed to delete offer" });
    }
  });

  app.get('/api/vendor/stores/:id/deactivation-reason', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const storeId = req.params.id;
      const store = await storage.getStore(storeId);
      if (!store) {
        return res.status(404).json({ message: 'Store not found' });
      }
      // Only vendor owner or admin can view reason
      const isOwner = store.vendorId === req.userId || req.userRole === 'admin';
      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const rows = await db
        .select()
        .from(configAudits)
        .where(and(eq(configAudits.entityType, 'store_status'), eq(configAudits.entityId, storeId)))
        .orderBy(desc(configAudits.createdAt))
        .limit(1);
      const last = rows[0] as any;
      const changes = last?.changes || {};
      const reason = changes?.reason ?? null;
      res.json({ status: store.status, reason });
    } catch (error) {
      console.error('Error fetching deactivation reason:', error);
      res.status(500).json({ message: 'Failed to fetch deactivation reason' });
    }
  });

  // Vendor Product Management Routes
  app.post('/api/products', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      await ensureVariantSchema();
      const { storeId, variants, ...productData } = req.body;
      const store = await storage.getStore(storeId);

      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      if (store.vendorId !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ message: "Not authorized to add products to this store" });
      }

      const processedVariants = variants && typeof variants === 'object' ? JSON.stringify(variants) : variants;
      let validatedData = insertProductSchema.parse({ storeId, variants: processedVariants, ...productData });
      if (Array.isArray(variants)) {
        const variantStockTotal = variants.reduce((s: number, v: any) => s + Number(v?.stock || 0), 0);
        validatedData = { ...validatedData, stock: variantStockTotal } as any;
      }
      const product = await storage.createProduct(validatedData);
      if (Array.isArray(variants)) {
        for (const v of variants) {
          const ok = variantSchema.parse(v);
          await storage.createProductVariant({
            productId: product.id,
            name: ok.name as any,
            sku: ok.sku,
            attributes: { type: ok.type, option: ok.option } as any,
            price: String(ok.price),
            stock: Number(ok.stock),
            barcode: (ok as any).barcode,
            weightKg: (ok as any).weightKg ? String((ok as any).weightKg) : undefined,
            lengthCm: (ok as any).lengthCm ? String((ok as any).lengthCm) : undefined,
            widthCm: (ok as any).widthCm ? String((ok as any).widthCm) : undefined,
            heightCm: (ok as any).heightCm ? String((ok as any).heightCm) : undefined,
            images: (ok as any).images,
            isActive: true,
          } as any);
        }
      }
      res.status(201).json(serializeProduct(product));
    } catch (error: any) {
      console.error("Error creating product:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put('/api/products/:id', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const productId = req.params.id;
      const existingProduct = await storage.getProduct(productId);

      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const store = await storage.getStore(existingProduct.storeId);
      if (!store || (store.vendorId !== req.userId && req.userRole !== "admin")) {
        return res.status(403).json({ message: "Not authorized to update this product" });
      }

      const { storeId, variants, ...updateData } = req.body;
      const processedVariants = variants && typeof variants === 'object' ? JSON.stringify(variants) : variants;
      const { ...sanitizedUpdates } = insertProductSchema.partial().parse({ variants: processedVariants, ...updateData });

      const updatedProduct = await storage.updateProduct(productId, sanitizedUpdates);
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found after update" });
      }
      res.json(serializeProduct(updatedProduct));
    } catch (error: any) {
      console.error("Error updating product:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, isVendor, async (req: any, res) => {
    const productId = req.params.id;
    try {
      const existingProduct = await storage.getProduct(productId);

      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const store = await storage.getStore(existingProduct.storeId);
      if (!store || (store.vendorId !== req.userId && req.userRole !== "admin")) {
        return res.status(403).json({ message: "Not authorized to delete this product" });
      }

      try {
        await storage.deleteProduct(productId);
        return res.status(204).send();
      } catch (err: any) {
        // If product is referenced by orders, archive (soft delete) instead
        if (String(err?.code) === '23503' || /foreign key/i.test(String(err?.message || ''))) {
          const updated = await storage.updateProductActiveStatus(productId, false);
          return res.status(200).json(serializeProduct(updated!));
        }
        throw err;
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get('/api/vendor/products', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const stores = await storage.getStoresByVendor(req.userId);
      const allProducts = await Promise.all(
        stores.map(store => storage.getProductsByStore(store.id))
      );
      const products = allProducts.flat();
      res.json(products.map(serializeProduct));
    } catch (error) {
      console.error("Error fetching vendor products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.patch('/api/vendor/products/:id', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const productId = req.params.id;
      const existingProduct = await storage.getProduct(productId);

      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const store = await storage.getStore(existingProduct.storeId);
      if (!store || store.vendorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to edit this product" });
      }

      const { storeId, variants, ...updateFields } = req.body;
      if (storeId !== undefined) {
        return res.status(400).json({ message: "Cannot change product store" });
      }

      const processedVariants = variants && typeof variants === 'object' ? JSON.stringify(variants) : variants;
      const validatedData = insertProductSchema.partial().parse({ variants: processedVariants, ...updateFields });
      const updatedProduct = await storage.updateProduct(productId, validatedData);
      res.json(serializeProduct(updatedProduct!));
    } catch (error: any) {
      console.error("Error updating product:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/vendor/products/:id', isAuthenticated, isVendor, async (req: any, res) => {
    const productId = req.params.id;
    try {
      const existingProduct = await storage.getProduct(productId);

      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const store = await storage.getStore(existingProduct.storeId);
      if (!store || store.vendorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to delete this product" });
      }

      try {
        const imgs = Array.isArray((existingProduct as any).images) ? (existingProduct as any).images : [];
        const baseDir = path.join(process.cwd(), 'uploads', 'product-images', String(store.id));
        for (const img of imgs) {
          try {
            const rel = String(img || '').replace(/^\//, '');
            const abs = path.join(process.cwd(), rel);
            if (abs.startsWith(baseDir)) {
              await fs.unlink(abs);
            }
          } catch { }
        }
        await storage.deleteProduct(productId);
        try {
          await db.insert(configAudits).values({ entityType: 'product', entityId: productId, action: 'delete', changes: { title: (existingProduct as any).title, storeId: (existingProduct as any).storeId }, changedBy: req.userId } as any);
        } catch { }
        return res.status(204).send();
      } catch (err: any) {
        // If product is referenced by orders, archive (soft delete) instead
        if (String(err?.code) === '23503' || /foreign key/i.test(String(err?.message || ''))) {
          const updated = await storage.updateProductActiveStatus(productId, false);
          try {
            await db.insert(configAudits).values({ entityType: 'product', entityId: productId, action: 'archive', changes: null as any, changedBy: req.userId } as any);
          } catch { }
          return res.status(200).json(serializeProduct(updated!));
        }
        throw err;
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.patch('/api/vendor/products/:id/toggle-active', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const productId = req.params.id;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const existingProduct = await storage.getProduct(productId);
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const store = await storage.getStore(existingProduct.storeId);
      if (!store || store.vendorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to modify this product" });
      }

      const updatedProduct = await storage.updateProductActiveStatus(productId, isActive);
      res.json(serializeProduct(updatedProduct!));
    } catch (error) {
      console.error("Error toggling product active status:", error);
      res.status(500).json({ message: "Failed to toggle product status" });
    }
  });

  // Product Group Management Routes
  app.get('/api/vendor/groups', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const stores = await storage.getStoresByVendor(req.userId);
      const allGroups = await Promise.all(
        stores.map(store => storage.getProductGroupsByStore(store.id))
      );
      const groups = allGroups.flat();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching product groups:", error);
      res.status(500).json({ message: "Failed to fetch product groups" });
    }
  });

  app.post('/api/vendor/groups', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const stores = await storage.getStoresByVendor(req.userId);
      if (stores.length === 0) {
        return res.status(400).json({ message: "Vendor must have a store to create product groups" });
      }

      const validatedData = insertProductGroupSchema.parse({
        ...req.body,
        storeId: req.body.storeId || stores[0].id,
      });

      const store = await storage.getStore(validatedData.storeId);
      if (!store || store.vendorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to create groups for this store" });
      }

      const group = await storage.createProductGroup(validatedData);
      res.status(201).json(group);
    } catch (error: any) {
      console.error("Error creating product group:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product group" });
    }
  });

  app.patch('/api/vendor/groups/:id', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const groupId = req.params.id;
      const existingGroup = await storage.getProductGroup(groupId);

      if (!existingGroup) {
        return res.status(404).json({ message: "Product group not found" });
      }

      const store = await storage.getStore(existingGroup.storeId);
      if (!store || store.vendorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to edit this group" });
      }

      const validatedData = insertProductGroupSchema.partial().parse(req.body);
      const updatedGroup = await storage.updateProductGroup(groupId, validatedData);
      res.json(updatedGroup);
    } catch (error: any) {
      console.error("Error updating product group:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid group data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product group" });
    }
  });

  app.delete('/api/vendor/groups/:id', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const groupId = req.params.id;
      const existingGroup = await storage.getProductGroup(groupId);

      if (!existingGroup) {
        return res.status(404).json({ message: "Product group not found" });
      }

      const store = await storage.getStore(existingGroup.storeId);
      if (!store || store.vendorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to delete this group" });
      }

      await storage.deleteProductGroup(groupId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product group:", error);
      res.status(500).json({ message: "Failed to delete product group" });
    }
  });

  app.post('/api/vendor/groups/:id/products', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const groupId = req.params.id;
      const { productId, position } = req.body;

      const group = await storage.getProductGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Product group not found" });
      }

      const store = await storage.getStore(group.storeId);
      if (!store || store.vendorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to modify this group" });
      }

      const product = await storage.getProduct(productId);
      if (!product || product.storeId !== group.storeId) {
        return res.status(400).json({ message: "Product not found or doesn't belong to the same store" });
      }

      const member = await storage.addProductToGroup(groupId, productId, position || 0);
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding product to group:", error);
      res.status(500).json({ message: "Failed to add product to group" });
    }
  });

  app.delete('/api/vendor/groups/:groupId/products/:productId', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const { groupId, productId } = req.params;

      const group = await storage.getProductGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: "Product group not found" });
      }

      const store = await storage.getStore(group.storeId);
      if (!store || store.vendorId !== req.userId) {
        return res.status(403).json({ message: "Not authorized to modify this group" });
      }

      await storage.removeProductFromGroup(groupId, productId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing product from group:", error);
      res.status(500).json({ message: "Failed to remove product from group" });
    }
  });


  // Order Management Routes
  app.post('/api/checkout/calculate', async (req: any, res) => {
    try {
      await ensureOrderSchema();
      await ensureVariantSchema();
      await ensureTaxShipSchema();
      const userId = req.userId || 'anonymous';
      const { items, shippingAddress, shippingStreet, shippingCity, shippingProvince, shippingPostalCode, shippingCountry, shippingMethod } = req.body as { items: Array<{ productId: string; storeId: string; quantity: number; price?: string; variantSku?: string; variantAttributes?: any }>; shippingAddress?: string; shippingStreet?: string; shippingCity?: string; shippingProvince?: string; shippingPostalCode?: string; shippingCountry?: string; shippingMethod?: string };
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Items required' });
      }

      const productIds: string[] = items.map(i => i.productId);
      const productsList = await Promise.all(productIds.map((id) => storage.getProduct(id)));
      const productMap = new Map((productsList || []).filter(Boolean).map((p: any) => [p.id, p]));
      const normalized = await Promise.all(items.map(async (i) => {
        let variantRow: any = null;
        if (i.variantSku) {
          variantRow = await storage.getVariantBySku(String(i.variantSku));
        }
        const priceSource = variantRow ? String(variantRow.price) : String(productMap.get(i.productId)?.price ?? '0');
        const provided = i.price;
        const parsedProvided = parseFloat(String(provided));
        const finalPrice = Number.isFinite(parsedProvided) ? String(parsedProvided) : priceSource;
        const vAttrs = (variantRow && typeof variantRow.attributes === 'object') ? variantRow.attributes : null;
        const variantTaxRate = vAttrs && vAttrs.taxRate != null ? parseFloat(String(vAttrs.taxRate)) : undefined;
        const taxExempt = (vAttrs && vAttrs.taxExempt === true) ? true : !!productMap.get(i.productId)?.taxExempt;
        return {
          productId: i.productId,
          storeId: i.storeId,
          quantity: i.quantity,
          price: parseFloat(finalPrice), // Ensure number
          originalPrice: parseFloat(finalPrice),
          variantSku: i.variantSku || null,
          variantAttributes: i.variantAttributes || null,
          weightKg: productMap.get(i.productId)?.weightKg ? parseFloat(String(productMap.get(i.productId)?.weightKg)) : undefined,
          lengthCm: productMap.get(i.productId)?.lengthCm ? parseFloat(String(productMap.get(i.productId)?.lengthCm)) : undefined,
          widthCm: productMap.get(i.productId)?.widthCm ? parseFloat(String(productMap.get(i.productId)?.widthCm)) : undefined,
          heightCm: productMap.get(i.productId)?.heightCm ? parseFloat(String(productMap.get(i.productId)?.heightCm)) : undefined,
          productCategory: productMap.get(i.productId)?.category,
          taxExempt,
          variantTaxRate,
        };
      }));

      // Calculate base subtotal
      const subtotal = normalized.reduce((s, it) => s + (it.price * it.quantity), 0);

      const discountedSubtotal = subtotal;
      const totalDiscount = 0;

      // Compute Tax (Note: Currently taxing original amount, should ideally tax discounted)
      const province = shippingProvince || detectProvince(shippingAddress || [shippingStreet, shippingCity, shippingProvince, shippingPostalCode, shippingCountry].filter(Boolean).join(', '));
      const taxRes = await computeTax(normalized as any as Array<TaxItem>, province, userId);

      // Compute Shipping
      let shipRes = await computeShipping(normalized.map(n => ({ ...n, price: String(n.price) })), province, shippingMethod);

      const total = discountedSubtotal + taxRes.amount + shipRes.amount;

      res.json({
        subtotal: subtotal.toFixed(2),
        discount: totalDiscount.toFixed(2),
        discountDetails: [],
        taxes: taxRes.amount.toFixed(2),
        shipping: shipRes.amount.toFixed(2),
        total: total.toFixed(2),
        taxDetails: taxRes.breakdown,
        carrier: shipRes.carrier,
        province: province || null,
        method: (shippingMethod || 'standard')
      });
    } catch (error) {
      console.error('Checkout calculate error:', error);
      res.status(500).json({ message: 'Failed to calculate' });
    }
  });
  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      await ensureOrderSchema();
      await ensureVariantSchema();
      await ensureTaxShipSchema();
      const userId = req.userId;
      const { items, paymentMethod, phoneNumber, preferredCommunication, saveInfo,
        recipientName, recipientEmail,
        shippingStreet, shippingApartment, shippingCity, shippingProvince, shippingPostalCode, shippingCountry,
        billingSameAsShipping, billingStreet, billingApartment, billingCity, billingProvince, billingPostalCode, billingCountry,
        specialInstructions,
      } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Order must contain at least one item" });
      }
      const composedShippingAddress = [shippingStreet, shippingApartment, shippingCity, shippingProvince, shippingPostalCode, shippingCountry].filter(Boolean).join(', ');
      const shippingAddress = composedShippingAddress || '';
      if (!shippingStreet || !shippingCity || !shippingProvince) {
        return res.status(400).json({ message: "Complete shipping address is required" });
      }

      const lowerMethod = 'cod';
      if (lowerMethod === 'cod') {
        const addr = String(shippingAddress).trim();
        if (addr.length < 10) {
          return res.status(400).json({ message: "Shipping address appears incomplete" });
        }
        if (!phoneNumber || typeof phoneNumber !== 'string' || phoneNumber.trim().length < 7) {
          return res.status(400).json({ message: "Phone number required for COD" });
        }
      }

      let totalComputed = 0;
      const validatedItems: any[] = [];
      const productIds: string[] = items.map((i: any) => i.productId);
      const productsList = await Promise.all(productIds.map((id) => storage.getProduct(id)));
      const productMap = new Map((productsList || []).filter(Boolean).map((p: any) => [p.id, p]));

      log(`Order create start: user=${userId} items=${items.length}`);

      const taxItems: Array<TaxItem> = [];
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) return res.status(404).json({ message: "Product not found" });
        if (product.status !== 'approved' || product.isActive !== true) {
          return res.status(400).json({ message: "Product not available" });
        }
        let variantRow: any = null;
        if (item.variantSku) {
          variantRow = await storage.getVariantBySku(String(item.variantSku));
          if (!variantRow || String(variantRow.productId) !== String(item.productId)) {
            return res.status(400).json({ message: "Invalid product variant" });
          }
          if (item.quantity <= 0 || item.quantity > Number(variantRow.stock || 0)) {
            return res.status(400).json({ message: "Insufficient stock for selected variant" });
          }
        } else {
          if (item.quantity <= 0 || item.quantity > product.stock) {
            return res.status(400).json({ message: "Insufficient stock for product" });
          }
        }
        if (lowerMethod === 'cod') {
          const store = await storage.getStore(product.storeId);
          if (!store || store.status !== 'approved') {
            return res.status(400).json({ message: "COD not available for selected items" });
          }
        }

        const base = variantRow ? parseFloat(String(variantRow.price)) : parseFloat(String(product.price));
        let effectivePrice = Number(base.toFixed(2));
        try {
          const activeOffers = await storage.getActiveOffersByStore(product.storeId);
          if (activeOffers && activeOffers.length > 0) {
            const sku = item.variantSku || (variantRow ? String(variantRow.sku) : null);
            const candidates = activeOffers.filter((o: any) => {
              const t = String(o.scopeType || 'products').toLowerCase();
              if (t === 'all') return true;
              if (t === 'products') return Array.isArray(o.scopeProducts) && o.scopeProducts.includes(item.productId);
              if (t === 'categories') return Array.isArray(o.scopeCategories) && o.scopeCategories.includes(String(product.category));
              if (t === 'variants') return sku != null && Array.isArray(o.scopeVariants) && o.scopeVariants.includes(String(sku));
              return false;
            });
            let best = effectivePrice;
            for (const o of candidates) {
              const dv = parseFloat(String(o.discountValue));
              const dt = String(o.discountType || 'percentage').toLowerCase();
              const cand = dt === 'fixed' ? Math.max(0, base - dv) : Math.max(0, base * (1 - dv / 100));
              if (cand < best) best = cand;
            }
            effectivePrice = Number(best.toFixed(2));
          }
        } catch { }
        log(`Item pricing: product=${item.productId} qty=${item.quantity} base=${base} effective=${effectivePrice}`);

        totalComputed += effectivePrice * item.quantity;
        validatedItems.push({
          orderId: '',
          productId: item.productId,
          storeId: product.storeId,
          quantity: item.quantity,
          price: effectivePrice.toFixed(2),
          variantSku: item.variantSku || null,
          variantAttributes: item.variantAttributes || null,
        });
        const vAttrs = (variantRow && typeof variantRow.attributes === 'object') ? variantRow.attributes : null;
        const vRate = vAttrs && vAttrs.taxRate != null ? parseFloat(String(vAttrs.taxRate)) : undefined;
        const isExempt = (vAttrs && vAttrs.taxExempt === true) ? true : !!(product as any).taxExempt;
        taxItems.push({ productId: item.productId, quantity: item.quantity, price: effectivePrice.toFixed(2), taxExempt: isExempt, variantTaxRate: vRate });
      }

      const sumItems = validatedItems.reduce((s, it) => s + parseFloat(String(it.price)) * Number(it.quantity), 0);
      if (Math.abs(sumItems - totalComputed) > 0.01) {
        log(`Order total adjustment: computed=${totalComputed} sumItems=${sumItems}`);
        totalComputed = parseFloat(sumItems.toFixed(2));
      }

      if (lowerMethod === 'cod') {
        if (totalComputed > 100000) {
          return res.status(400).json({ message: "COD not available for high-value orders" });
        }
        const codRiskStrict = ((process.env.COD_RISK_CHECK_STRICT || 'false').toLowerCase() === 'true');
        if (codRiskStrict) {
          const buyerOrders = await storage.getOrdersByBuyer(userId);
          const nowMs = Date.now();
          const recentCancelled = buyerOrders.filter(o => o.status === 'cancelled' && (nowMs - new Date(o.createdAt as any).getTime()) < (30 * 24 * 60 * 60 * 1000)).length;
          if (recentCancelled >= 2) {
            log(`COD risk check enforced: user=${userId} recentCancelled=${recentCancelled}`);
            return res.status(400).json({ message: `COD not available due to risk (${recentCancelled} cancellations in 30 days)` });
          }
        } else {
          log(`COD risk check bypassed for user=${userId}`);
        }
      }

      const province = shippingProvince || detectProvince(shippingAddress);
      const taxRes = await computeTax(taxItems, province, userId);
      const shipRes = await computeShipping(validatedItems.map(it => ({ productId: it.productId, quantity: it.quantity, price: it.price, weightKg: productMap.get(it.productId)?.weightKg ? parseFloat(String(productMap.get(it.productId)?.weightKg)) : undefined, lengthCm: productMap.get(it.productId)?.lengthCm ? parseFloat(String(productMap.get(it.productId)?.lengthCm)) : undefined, widthCm: productMap.get(it.productId)?.widthCm ? parseFloat(String(productMap.get(it.productId)?.widthCm)) : undefined, heightCm: productMap.get(it.productId)?.heightCm ? parseFloat(String(productMap.get(it.productId)?.heightCm)) : undefined })), province, (String(req.body.shippingMethod || 'standard')));
      const finalTotal = parseFloat((totalComputed + taxRes.amount + shipRes.amount).toFixed(2));
      const estimatedDelivery = lowerMethod === 'cod' ? '3-7 business days' : '2-5 business days';
      const orderRef = `PH-${new Date().toISOString().replace(/[-:T\.Z]/g, '').slice(0, 12)}`;

      const validatedOrder = insertOrderSchema.parse({
        buyerId: userId,
        total: finalTotal.toFixed(2),
        status: 'pending',
        paymentMethod: lowerMethod || null,
        shippingAddress,
        recipientName: recipientName || null,
        recipientEmail: recipientEmail || null,
        shippingStreet: shippingStreet || null,
        shippingApartment: shippingApartment || null,
        shippingCity: shippingCity || null,
        shippingPhone: phoneNumber || null,
        shippingProvince: province || null,
        shippingPostalCode: shippingPostalCode || null,
        shippingCountry: shippingCountry || 'Pakistan',
        shippingMethod: (String(req.body.shippingMethod || 'standard')),
        shippingCost: shipRes.amount.toFixed(2),
        specialInstructions: specialInstructions || null,
        billingSameAsShipping: !!billingSameAsShipping,
        billingStreet: billingSameAsShipping ? null : (billingStreet || null),
        billingApartment: billingSameAsShipping ? null : (billingApartment || null),
        billingCity: billingSameAsShipping ? null : (billingCity || null),
        billingProvince: billingSameAsShipping ? null : (billingProvince || null),
        billingPostalCode: billingSameAsShipping ? null : (billingPostalCode || null),
        billingCountry: billingSameAsShipping ? null : (billingCountry || 'Pakistan'),
        taxAmount: taxRes.amount.toFixed(2),
        taxDetails: taxRes.breakdown,
        preferredCommunication: preferredCommunication || null,
        codReceiptId: orderRef,
      });

      const order = await storage.createOrder(validatedOrder);
      log(`Order persist: id=${order.id} total=${validatedOrder.total}`);

      await Promise.all(
        validatedItems.map((vi) => storage.createOrderItem({ ...vi, orderId: order.id }))
      );

      for (const vi of validatedItems) {
        if (vi.variantSku) {
          try {
            const current = await storage.getVariantBySku(String(vi.variantSku));
            if (current) {
              const newStock = Math.max(0, Number(current.stock || 0) - vi.quantity);
              await storage.updateProductVariant(current.id, { stock: newStock } as any);
            }
          } catch { }
        } else {
          const p = await storage.getProduct(vi.productId);
          if (p) {
            const newStock = Math.max(0, (p.stock || 0) - vi.quantity);
            await storage.updateProduct(p.id, { stock: newStock });
          }
        }
      }

      if (lowerMethod === 'cod') {
        try {
          let adminId: string | undefined;
          if (process.env.ADMIN_EMAIL) {
            const admin = await storage.getUserByEmail(process.env.ADMIN_EMAIL);
            adminId = admin?.id;
          }
          if (!adminId) {
            const allUsers = await storage.getAllUsers();
            adminId = allUsers.find(u => u.role === 'admin')?.id;
          }
          if (adminId) {
            await storage.createMessage({
              senderId: adminId,
              receiverId: userId,
              orderId: order.id,
              message: `Your COD order ${orderRef} has been confirmed. Estimated delivery: ${estimatedDelivery}. Please prepare PKR ${totalComputed.toFixed(2)} for payment on delivery.`,
            } as any);
          }
        } catch { }
      }

      try {
        if (saveInfo === true) {
          const current = await storage.getUser(userId);
          if (current) {
            await storage.upsertUser({
              id: current.id,
              email: current.email,
              firstName: current.firstName,
              lastName: current.lastName,
              phone: phoneNumber || (current as any).phone || null,
              defaultShippingAddress: shippingAddress,
              shippingPrefs: {
                recipientName,
                recipientEmail,
                shippingStreet,
                shippingApartment,
                shippingCity,
                shippingProvince,
                shippingPostalCode,
                shippingCountry,
              },
              notificationPrefs: (current as any).notificationPrefs || null,
              role: current.role,
            } as any);
          }
        }
      } catch { }

      res.status(201).json({ ...order, reference: orderRef, estimatedDelivery });
    } catch (error: any) {
      console.error("Error creating order:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get('/api/orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const order = await storage.getOrder(req.params.id);

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const user = await storage.getUser(userId);
      if (order.buyerId !== userId && user?.role !== "admin") {
        const orderItems = await storage.getOrderItems(order.id);
        const vendorStores = await storage.getStoresByVendor(userId);
        const vendorStoreIds = vendorStores.map(s => s.id);
        const hasVendorItem = orderItems.some(item => vendorStoreIds.includes(item.storeId));

        if (!hasVendorItem) {
          return res.status(403).json({ message: "Not authorized to view this order" });
        }
      }

      const items = await storage.getOrderItems(order.id);
      const buyer = await storage.getUser(order.buyerId);
      res.json({ ...order, items, buyer: buyer ? sanitizeUser(buyer) : null });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.get('/api/orders/:id/receipt', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const user = await storage.getUser(userId);
      if (order.buyerId !== userId && user?.role !== 'admin') {
        const orderItems = await storage.getOrderItems(order.id);
        const vendorStores = await storage.getStoresByVendor(userId);
        const vendorStoreIds = vendorStores.map(s => s.id);
        const hasVendorItem = orderItems.some(item => vendorStoreIds.includes(item.storeId));
        if (!hasVendorItem) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }

      const itemsWithProducts = await storage.getOrderItemsWithProductsForOrders([order.id]);
      const list = itemsWithProducts[order.id] || [];
      const storeIds = Array.from(new Set(list.map(i => i.storeId)));
      const stores = await Promise.all(storeIds.map(id => storage.getStore(id)));
      const storeMap = new Map(stores.filter(Boolean).map(s => [s!.id, s!.name]));

      const subtotal = list.reduce((s: number, it: any) => s + parseFloat(String(it.price)) * Number(it.quantity), 0);
      const shippingCost = parseFloat(String((order as any).shippingCost ?? 0));
      const taxAmount = parseFloat(String((order as any).taxAmount ?? 0));
      const total = parseFloat(String(order.total));

      const buyer = await storage.getUser(order.buyerId);

      const receipt = {
        orderId: order.id,
        receiptNumber: (order as any).codReceiptId || (order as any).paymentReference || null,
        createdAt: order.createdAt as any,
        paymentMethod: (order as any).paymentMethod || null,
        shippingMethod: (order as any).shippingMethod || null,
        estimatedDelivery: (order as any).processingEstimate || (((order as any).paymentMethod || '').toLowerCase() === 'cod' ? '3-7 business days' : null),
        buyer: buyer ? { firstName: (buyer as any).firstName || null, lastName: (buyer as any).lastName || null, email: buyer.email || null, phone: (buyer as any).phone || null } : null,
        shippingAddress: (order as any).shippingAddress || null,
        items: list.map((it: any) => ({
          productTitle: it.product?.title || 'Product',
          productImage: it.product?.images?.[0] || null,
          storeName: storeMap.get(it.storeId) || it.storeId,
          quantity: Number(it.quantity),
          unitPrice: String(it.price),
          lineTotal: (parseFloat(String(it.price)) * Number(it.quantity)).toFixed(2),
        })),
        subtotal: subtotal.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
      };

      res.json(receipt);
    } catch (error) {
      console.error('Receipt build error:', error);
      res.status(500).json({ message: 'Failed to build receipt' });
    }
  });

  app.get('/api/orders/:id/receipt.html', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).send('Not found');
      }

      const user = await storage.getUser(userId);
      if (order.buyerId !== userId && user?.role !== 'admin') {
        const orderItems = await storage.getOrderItems(order.id);
        const vendorStores = await storage.getStoresByVendor(userId);
        const vendorStoreIds = vendorStores.map(s => s.id);
        const hasVendorItem = orderItems.some(item => vendorStoreIds.includes(item.storeId));
        if (!hasVendorItem) {
          return res.status(403).send('Forbidden');
        }
      }

      const itemsWithProducts = await storage.getOrderItemsWithProductsForOrders([order.id]);
      const list = itemsWithProducts[order.id] || [];
      const storeIds = Array.from(new Set(list.map(i => i.storeId)));
      const stores = await Promise.all(storeIds.map(id => storage.getStore(id)));
      const storeMap = new Map(stores.filter(Boolean).map(s => [s!.id, s!.name]));

      const dt = order.createdAt ? new Date(order.createdAt as any) : new Date();
      const dateStr = dt.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' });
      const payment = ((order as any).paymentMethod || 'cod').toString();
      const subtotal = list.reduce((s: number, it: any) => s + parseFloat(String(it.price)) * Number(it.quantity), 0);
      const shipping = parseFloat(String((order as any).shippingCost ?? 0));
      const taxes = parseFloat(String((order as any).taxAmount ?? 0));
      const total = subtotal + shipping + taxes;
      const receiptId = (order as any).codReceiptId || (order as any).paymentReference || '—';
      const est = (order as any).processingEstimate || (payment.toLowerCase() === 'cod' ? '3-7 business days' : '—');
      const buyer = await storage.getUser(order.buyerId);
      const buyerName = buyer ? `${(buyer as any).firstName || ''} ${(buyer as any).lastName || ''}`.trim() : '';
      const buyerEmail = buyer?.email || '';
      const buyerPhone = (order as any).shippingPhone || (buyer as any)?.phone || '';

      const itemRows = list.map((it: any) => {
        const img = it.product?.images?.[0] || '';
        const title = it.product?.title || 'Product';
        const storeName = storeMap.get(it.storeId) || it.storeId;
        const lineTotal = parseFloat(String(it.price)) * Number(it.quantity);
        const imgTag = img ? `<img src="${img}" alt="${title}" style="width:48px;height:48px;object-fit:cover;border-radius:6px"/>` : '';
        return `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #eee">
        ${imgTag}
        <div style="flex:1;min-width:0">
          <div style="font-weight:600">${title}</div>
          <div style="font-size:12px;color:#6b7280">Sold by: ${storeName}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600">PKR ${lineTotal.toLocaleString()}</div>
          <div style="font-size:12px;color:#6b7280">Qty: ${Number(it.quantity)}</div>
        </div>
      </div>
    `;
      }).join('');

      const styles = `
    body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;background:#f7f7f7;margin:24px}
    .wrap{max-width:900px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
    .inner{padding:24px}
    .title{display:flex;align-items:center;gap:8px;font-weight:700;font-size:24px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:8px}
    .label{font-size:12px;color:#6b7280}
    .value{font-weight:600}
    .muted{color:#6b7280;font-size:14px;margin-top:12px}
    .section{margin-top:16px;padding-top:16px;border-top:1px solid #eee}
    .grid-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .totals{display:grid;gap:8px;margin-top:12px}
    .row{display:flex;justify-content:space-between}
    .row .label{font-size:14px}
    .row .value{font-weight:600}
    .primary{background:#f97316;color:#fff;border:none;border-radius:8px;padding:10px 14px}
  `;

      const html = `<!doctype html><meta charset="utf-8"><title>Receipt ${order.id}</title>
  <style>${styles}</style>
  <div class="wrap"><div class="inner">
    <div class="title"><span style="color:#16a34a">✔</span> Order Confirmed</div>
    <div class="grid">
      <div><div class="label">Order Number</div><div class="value">${order.id.slice(0, 8)}</div></div>
      <div><div class="label">Receipt Number</div><div class="value">${receiptId}</div></div>
      <div><div class="label">Date and Time</div><div class="value">${dateStr}</div></div>
      <div><div class="label">Payment</div><div class="value">${payment}</div></div>
      <div><div class="label">Shipping Method</div><div class="value">${(order as any).shippingMethod || 'standard'}</div></div>
      <div><div class="label">Estimated Delivery</div><div class="value">${est}</div></div>
    </div>
    <div class="muted">A confirmation has been sent. Thank you for your purchase!</div>
    <div class="section">
      <div class="grid-two">
        <div>
          <div style="font-weight:600;margin-bottom:6px">Buyer</div>
          <div class="label">Name</div>
          <div class="value">${buyerName || '—'}</div>
          <div class="label" style="margin-top:6px">Email</div>
          <div class="value">${buyerEmail || '—'}</div>
          <div class="label" style="margin-top:6px">Phone</div>
          <div class="value">${buyerPhone || '—'}</div>
        </div>
        <div>
          <div style="font-weight:600;margin-bottom:6px">Shipping Address</div>
          <div class="value">${(order as any).shippingAddress || '—'}</div>
        </div>
      </div>
    </div>
    <div class="section">
      <div style="font-weight:600">Order Summary</div>
      ${itemRows}
      <div class="totals">
        <div class="row"><div class="label">Subtotal</div><div class="value">PKR ${subtotal.toLocaleString()}</div></div>
        <div class="row"><div class="label">Shipping</div><div class="value">PKR ${shipping.toLocaleString()}</div></div>
        <div class="row"><div class="label">Taxes</div><div class="value">PKR ${taxes.toLocaleString()}</div></div>
        <div class="row" style="border-top:1px solid #eee;padding-top:8px"><div class="label">Total</div><div class="value">PKR ${total.toLocaleString()}</div></div>
      </div>
    </div>
  </div></div>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('Receipt HTML error:', error);
      res.status(500).send('Failed to build receipt');
    }
  });

  app.get('/api/buyer/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const orders = await storage.getOrdersByBuyer(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching buyer orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.put('/api/orders/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { status, processingEstimate, trackingNumber, deliveryConfirmed, courierService } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== "admin") {
        const orderItems = await storage.getOrderItems(order.id);
        const vendorStores = await storage.getStoresByVendor(userId);
        const vendorStoreIds = vendorStores.map(s => s.id);
        const hasVendorItem = orderItems.some(item => vendorStoreIds.includes(item.storeId));

        if (!hasVendorItem) {
          return res.status(403).json({ message: "Not authorized to update this order" });
        }
      }

      const current = (order.status || '').toLowerCase();
      const next = String(status).toLowerCase();
      const validTransitions: Record<string, string[]> = {
        pending: ['processing'],
        processing: ['shipped'],
        shipped: ['delivered'],
      };
      if (!validTransitions[current] || !validTransitions[current].includes(next)) {
        return res.status(400).json({ message: `Invalid state change from ${current} to ${next}` });
      }

      const metaUpdates: any = {};
      if (next === 'processing' && processingEstimate) metaUpdates.processingEstimate = processingEstimate;
      if (next === 'shipped') {
        if (!trackingNumber && !order.trackingNumber) {
          return res.status(400).json({ message: 'Tracking number is required to mark as shipped' });
        }
        if (!courierService && !(order as any).courierService) {
          return res.status(400).json({ message: 'Courier service is required to mark as shipped' });
        }
        if (trackingNumber) metaUpdates.trackingNumber = trackingNumber;
        if (courierService) metaUpdates.courierService = courierService;
      }
      if (next === 'delivered') {
        const hasTracking = !!(trackingNumber || order.trackingNumber);
        const hasCourier = !!(courierService || (order as any).courierService);
        if (!hasTracking || !hasCourier) {
          return res.status(400).json({ message: 'Shipment tracking must be verified before delivery' });
        }
        const method = (order.paymentMethod || '').toLowerCase();
        const isCod = method === 'cod' || method === 'cash';
        const paymentCleared = isCod ? (order.codPaymentStatus === 'collected') : ((order as any).paymentVerificationStatus === 'cleared');
        if (!paymentCleared) {
          return res.status(400).json({ message: 'Payment not verified. Delivery disabled.' });
        }
        if (deliveryConfirmed) metaUpdates.deliveryConfirmedAt = new Date();
      }

      const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
      if (!updatedOrder) return res.status(404).json({ message: "Order not found" });
      if (Object.keys(metaUpdates).length > 0) {
        await storage.updateOrderMeta(req.params.id, metaUpdates);
      }

      try {
        const buyer = await storage.getUser(order.buyerId);
        if (buyer) {
          await storage.createMessage({
            senderId: userId,
            receiverId: buyer.id,
            orderId: order.id,
            message: `Order status updated to ${status}${courierService ? ` via ${courierService}` : ''}${trackingNumber ? `, tracking: ${trackingNumber}` : ''}${processingEstimate ? `, estimate: ${processingEstimate}` : ''}.`,
          } as any);
        }
      } catch { }

      const finalOrder = await storage.getOrder(req.params.id);
      res.json(finalOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.post('/api/orders/:id/cancel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { reason } = req.body as { reason?: string };
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      const user = await storage.getUser(userId);
      if (order.buyerId !== userId && user?.role !== 'admin') {
        const orderItems = await storage.getOrderItems(order.id);
        const vendorStores = await storage.getStoresByVendor(userId);
        const vendorStoreIds = vendorStores.map(s => s.id);
        const hasVendorItem = orderItems.some(item => vendorStoreIds.includes(item.storeId));
        if (!hasVendorItem) {
          return res.status(403).json({ message: "Not authorized to cancel this order" });
        }
      }
      if (!reason || !reason.trim()) {
        console.log(`[Cancel Order] Missing reason. Body:`, req.body);
        return res.status(400).json({ message: 'Cancellation reason is required' });
      }
      const created = new Date(order.createdAt as any).getTime();
      const now = Date.now();
      // For debugging purposes, let's log the times
      console.log(`[Cancel Order] Order: ${order.id}, Created: ${new Date(created).toISOString()}, Now: ${new Date(now).toISOString()}, Diff: ${now - created}`);

      // Extend cancellation window to 7 days
      const withinWindow = now - created < 7 * 24 * 60 * 60 * 1000;
      if (!withinWindow) {
        console.log(`[Cancel Order] Window expired for order ${order.id}`);
        return res.status(400).json({ message: "Cancellation window has expired (7 days limit)" });
      }
      const updated = await storage.updateOrderStatus(order.id, 'cancelled');
      const method = (order.paymentMethod || '').toLowerCase();
      const meta: any = { cancellationReason: reason, cancelledBy: user?.role === 'admin' ? 'admin' : (order.buyerId === userId ? 'buyer' : 'vendor'), cancelledAt: new Date() as any };
      if (method === 'cod' || method === 'cash') {
        meta.codPaymentStatus = 'collected';
        meta.codCollectedAt = new Date() as any;
        meta.codReceiptId = meta.codReceiptId || 'CANCELLED';
      } else if (method === 'jazzcash' || method === 'easypaisa') {
        meta.paymentVerificationStatus = 'cleared';
        meta.paymentVerifiedAt = new Date() as any;
        meta.paymentReference = 'CANCELLED';
      }
      await storage.updateOrderMeta(order.id, meta);
      const items = await storage.getOrderItems(order.id);
      for (const it of items) {
        const p = await storage.getProduct(it.productId);
        if (p) await storage.updateProduct(p.id, { stock: (p.stock || 0) + it.quantity });
      }
      try {
        const buyer = await storage.getUser(order.buyerId);
        if (buyer) {
          await storage.createMessage({
            senderId: userId,
            receiverId: buyer.id,
            orderId: order.id,
            message: `Your order has been cancelled: ${reason}.`,
          } as any);
        }
      } catch { }
      res.json(updated);
    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({ message: 'Failed to cancel order' });
    }
  });

  app.post('/api/orders/:id/cod/collect', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ message: 'Order not found' });
      if ((order.paymentMethod || '').toLowerCase() !== 'cod') return res.status(400).json({ message: 'Not a COD order' });

      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        const orderItems = await storage.getOrderItems(order.id);
        const vendorStores = await storage.getStoresByVendor(userId);
        const vendorStoreIds = vendorStores.map(s => s.id);
        const hasVendorItem = orderItems.some(item => vendorStoreIds.includes(item.storeId));
        if (!hasVendorItem) {
          return res.status(403).json({ message: 'Not authorized to record payment for this order' });
        }
      }

      const receiptId = `RCPT-${new Date().toISOString().replace(/[-:T\.Z]/g, '').slice(0, 12)}`;
      const updated = await storage.updateOrderMeta(order.id, {
        codPaymentStatus: 'collected',
        codCollectedAt: new Date() as any,
        codReceiptId: receiptId,
      });

      try {
        const buyer = await storage.getUser(order.buyerId);
        if (buyer) {
          await storage.createMessage({
            senderId: userId,
            receiverId: buyer.id,
            orderId: order.id,
            message: `Payment collected for order. Receipt: ${receiptId}.`,
          } as any);
        }
      } catch { }

      res.json(updated);
    } catch (error) {
      console.error('COD collect error:', error);
      res.status(500).json({ message: 'Failed to record COD payment' });
    }
  });

  app.post('/api/orders/:id/reactivate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { reason } = req.body as { reason?: string };
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ message: 'Order not found' });
      if (order.status !== 'cancelled') return res.status(400).json({ message: 'Only cancelled orders can be re-activated' });

      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        const orderItems = await storage.getOrderItems(order.id);
        const vendorStores = await storage.getStoresByVendor(userId);
        const vendorStoreIds = vendorStores.map(s => s.id);
        const hasVendorItem = orderItems.some(item => vendorStoreIds.includes(item.storeId));
        if (!hasVendorItem) {
          return res.status(403).json({ message: 'Not authorized to reactivate this order' });
        }
      }

      const cancelledAt = (order as any).cancelledAt ? new Date((order as any).cancelledAt as any).getTime() : null;
      if (cancelledAt && Date.now() - cancelledAt > 7 * 24 * 60 * 60 * 1000) {
        return res.status(400).json({ message: 'Reactivation window expired' });
      }
      const items = await storage.getOrderItems(order.id);
      for (const it of items) {
        const p = await storage.getProduct(it.productId);
        if (!p || (p.stock || 0) < it.quantity) {
          return res.status(400).json({ message: 'Insufficient stock to reactivate' });
        }
      }

      const updated = await storage.updateOrderStatus(order.id, 'pending');
      await storage.updateOrderMeta(order.id, { reactivatedAt: new Date() as any, reactivatedBy: user?.role === 'admin' ? 'admin' : 'vendor' });
      try {
        const buyer = await storage.getUser(order.buyerId);
        if (buyer) {
          await storage.createMessage({
            senderId: userId,
            receiverId: buyer.id,
            orderId: order.id,
            message: `Order re-activated${reason ? `: ${reason}` : ''}.`,
          } as any);
        }
      } catch { }
      res.json(updated);
    } catch (error) {
      console.error('Reactivate order error:', error);
      res.status(500).json({ message: 'Failed to reactivate order' });
    }
  });

  app.post('/api/orders/:id/payment/verify', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { method, reference } = req.body as { method: string; reference?: string };
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ message: 'Order not found' });

      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        const orderItems = await storage.getOrderItems(order.id);
        const vendorStores = await storage.getStoresByVendor(userId);
        const vendorStoreIds = vendorStores.map(s => s.id);
        const hasVendorItem = orderItems.some(item => vendorStoreIds.includes(item.storeId));
        if (!hasVendorItem) {
          return res.status(403).json({ message: 'Not authorized to verify payment for this order' });
        }
      }

      const m = (method || '').toLowerCase();
      if (!['cash', 'cod', 'jazzcash', 'easypaisa'].includes(m)) {
        return res.status(400).json({ message: 'Invalid payment method' });
      }
      const updates: any = {
        paymentVerificationStatus: 'cleared',
        paymentVerifiedAt: new Date() as any,
        paymentReference: reference || null,
      };
      if (!order.paymentMethod) updates.paymentMethod = m;
      const updated = await storage.updateOrderMeta(order.id, updates);
      try {
        const buyer = await storage.getUser(order.buyerId);
        if (buyer) {
          await storage.createMessage({
            senderId: userId,
            receiverId: buyer.id,
            orderId: order.id,
            message: `Payment verified (${m})${reference ? `, ref: ${reference}` : ''}.`,
          } as any);
        }
      } catch { }
      res.json(updated);
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ message: 'Failed to verify payment' });
    }
  });

  // Vendor Dashboard Routes
  app.get('/api/vendor/orders', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      await ensureVariantSchema();
      const stores = await storage.getStoresByVendor(req.userId);
      const allOrders = await Promise.all(
        stores.map(store => storage.getOrdersByStore(store.id))
      );
      const uniqueOrders = Array.from(
        new Map(allOrders.flat().map(order => [order.id, order])).values()
      );

      // Batch fetch all order items with products in a single query
      const orderIds = uniqueOrders.map(o => o.id).filter(Boolean);
      const itemsByOrderId = await storage.getOrderItemsWithProductsForOrders(orderIds);

      // Fetch buyers info
      const buyerIds = Array.from(new Set(uniqueOrders.map(o => o.buyerId)));
      const buyers = await Promise.all(buyerIds.map(id => storage.getUser(id)));
      const buyerMap = new Map(buyers.filter(Boolean).map(b => [b!.id, b!]));

      // Attach items to their respective orders and serialize decimal fields
      const ordersWithItems = uniqueOrders.map(order => ({
        ...order,
        total: String(order.total), // Serialize order total as string to match frontend contract
        items: (itemsByOrderId[order.id] || []).map(item => ({
          ...item,
          product: item.product ? serializeProduct(item.product) : null,
        })),
        buyer: buyerMap.get(order.buyerId)
      }));

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get('/api/vendor/analytics', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const stores = await storage.getStoresByVendor(req.userId);
      const storeIds = stores.map(s => s.id);

      const allTransactions = await Promise.all(
        storeIds.map(id => storage.getTransactionsByStore(id))
      );
      const transactions = allTransactions.flat();

      const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalEarnings = transactions.reduce((sum, t) => sum + Number(t.vendorEarnings), 0);
      const totalOrders = new Set(transactions.map(t => t.orderId)).size;

      const products = await Promise.all(
        storeIds.map(id => storage.getProductsByStore(id))
      );
      const totalProducts = products.flat().length;

      res.json({
        totalRevenue: totalRevenue.toFixed(2), // Serialize as string with 2 decimal places
        totalEarnings: totalEarnings.toFixed(2), // Serialize as string with 2 decimal places
        totalOrders,
        totalProducts,
        totalStores: stores.length,
      });
    } catch (error) {
      console.error("Error fetching vendor analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/vendor/earnings', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const stores = await storage.getStoresByVendor(req.userId);
      const storeIds = stores.map(s => s.id);

      const allTransactions = await Promise.all(
        storeIds.map(id => storage.getTransactionsByStore(id))
      );
      const transactions = allTransactions.flat();

      res.json(transactions);
    } catch (error) {
      console.error("Error fetching vendor earnings:", error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  // Admin Routes
  app.get('/api/admin/stores', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status } = req.query;
      const stores = await storage.getAllStores(status as string);
      res.json(stores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ message: "Failed to fetch stores" });
    }
  });

  app.put('/api/admin/stores/:id/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status, reason } = req.body || {};
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const storeId = req.params.id;
      const before = await storage.getStore(storeId);
      const updatedStore = await storage.updateStoreStatus(storeId, status);
      if (!updatedStore) {
        return res.status(404).json({ message: "Store not found" });
      }

      try {
        await db.insert(configAudits).values({
          entityType: 'store_status',
          entityId: storeId,
          action: 'update',
          changes: { previous: before?.status, status, reason: reason || null } as any,
          changedBy: req.userId,
        } as any);
      } catch { }

      try {
        const vendorUser = await storage.getUser(updatedStore.vendorId);
        if (vendorUser) {
          const msgLines = [
            `Your store "${updatedStore.name}" status has been updated to ${status}.`,
            reason ? `Reason: ${reason}` : '',
          ].filter(Boolean);
          await storage.createMessage({
            senderId: req.userId,
            receiverId: vendorUser.id,
            orderId: undefined as any,
            message: msgLines.join(' '),
          } as any);
        }
      } catch { }

      res.json(updatedStore);
    } catch (error) {
      console.error("Error updating store status:", error);
      res.status(500).json({ message: "Failed to update store status" });
    }
  });

  app.get('/api/admin/stores/:id/products', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const storeId = req.params.id;
      const list = await storage.getProductsByStore(storeId);
      res.json(list.map(serializeProduct));
    } catch (error) {
      console.error('Error fetching store products:', error);
      res.status(500).json({ message: 'Failed to fetch products for store' });
    }
  });

  app.get('/api/admin/stores/:id/activities', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const storeId = req.params.id;
      const orders = await storage.getOrdersByStore(storeId);
      const receivedOrders = orders.length;
      const fulfilledOrdersList = orders.filter((o: any) => ['completed', 'delivered'].includes(String(o.status || '').toLowerCase()));
      const fulfilledOrders = fulfilledOrdersList.length;
      const canceledOrders = orders.filter((o: any) => String(o.status || '').toLowerCase() === 'cancelled').length;
      const itemsLists = await Promise.all(fulfilledOrdersList.map((o: any) => storage.getOrderItems(o.id)));
      const revenueNum = itemsLists
        .flat()
        .filter((it: any) => String(it.storeId) === String(storeId))
        .reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
      const revenue = revenueNum.toFixed(2);
      res.json({ receivedOrders, fulfilledOrders, canceledOrders, revenue });
    } catch (error) {
      console.error('Error fetching store activities:', error);
      res.status(500).json({ message: 'Failed to fetch store activities' });
    }
  });

  app.get('/api/admin/products', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status } = req.query;
      const productsResult = await storage.getAllProducts(status ? { status: status as string } : {});
      // Serialize product prices to strings for API response
      const serializedResult = {
        ...productsResult,
        products: productsResult.products.map(serializeProduct)
      };
      res.json(serializedResult);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/admin/verification/docs', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const storeId = req.query.storeId as string;
      if (!storeId) return res.status(400).json({ message: 'storeId required' });
      const dir = path.join(process.cwd(), 'uploads', 'verification', storeId);
      const exists = await fs
        .access(dir)
        .then(() => true)
        .catch(() => false);
      if (!exists) return res.json([]);
      const files = await fs.readdir(dir);
      const items = files.map((name: string) => ({ name, url: `/uploads/verification/${storeId}/${name}` }));
      res.json(items);
    } catch (error) {
      console.error('Admin docs list error:', error);
      res.status(500).json({ message: 'Failed to list docs' });
    }
  });

  app.get('/api/admin/analytics', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const products = await storage.getAllProducts();
      const stores = await storage.getAllStores();
      const users = await storage.getAllUsers();
      const orders = await storage.getAllOrders();

      const deliveredRevenue = orders
        .filter((o: any) => (o.status || '').toLowerCase() === 'delivered')
        .reduce((sum, o) => sum + (Number((o as any).total) || 0), 0);

      const receivedOrdersValue = orders
        .filter((o: any) => ['pending', 'processing', 'shipped'].includes((o.status || '').toLowerCase()))
        .reduce((sum, o) => sum + (Number((o as any).total) || 0), 0);

      const totalRevenue = deliveredRevenue;
      const pendingStores = stores.filter(s => s.status === 'pending').length;
      const pendingProducts = products.products.filter(p => p.status === 'pending').length;
      const reviewAgg = await storage.getPlatformReviewAnalytics();

      const codOrders = orders.filter((o: any) => (o.paymentMethod || '').toLowerCase() === 'cod').length;
      const codDelivered = orders.filter((o: any) => (o.paymentMethod || '').toLowerCase() === 'cod' && o.status === 'delivered').length;

      const storesByDistrict: { [key: string]: number } = {};
      stores.forEach((store: any) => {
        if (store.district) {
          storesByDistrict[store.district] = (storesByDistrict[store.district] || 0) + 1;
        }
      });

      const giBrandCounts: { [key: string]: number } = {};
      products.products.forEach((product: any) => {
        if (product.giBrand) {
          giBrandCounts[product.giBrand] = (giBrandCounts[product.giBrand] || 0) + 1;
        }
      });
      const topGIBrands = Object.entries(giBrandCounts)
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => b.count - a.count);

      // SKU-level metrics
      let skuMetrics: Array<{ sku: string; units: number; revenue: number; stock: number }> = [];
      try {
        const orderIds = orders.map((o: any) => o.id);
        const itemsGrouped = await storage.getOrderItemsWithProductsForOrders(orderIds);
        const skuAgg: Record<string, { units: number; revenue: number }> = {};
        for (const oid of Object.keys(itemsGrouped)) {
          for (const it of (itemsGrouped[oid] || []) as any[]) {
            if (!it.variantSku) continue;
            const key = String(it.variantSku);
            const units = Number(it.quantity || 0);
            const price = parseFloat(String(it.price));
            const revenue = units * price;
            const prev = skuAgg[key] || { units: 0, revenue: 0 };
            skuAgg[key] = { units: prev.units + units, revenue: prev.revenue + revenue };
          }
        }
        const skus = Object.keys(skuAgg);
        const variantStocks: Record<string, number> = {};
        if (skus.length > 0) {
          const vars = await db.select().from(productVariants).where(inArray(productVariants.sku, skus));
          for (const v of vars as any[]) {
            variantStocks[String(v.sku)] = Number(v.stock || 0);
          }
        }
        skuMetrics = skus.map(sku => ({ sku, units: skuAgg[sku].units, revenue: Number(skuAgg[sku].revenue.toFixed(2)), stock: variantStocks[sku] ?? 0 }));
      } catch { }

      const analytics = {
        totalProducts: products.total,
        totalStores: stores.length,
        totalUsers: users.length,
        totalOrders: orders.length,
        totalRevenue,
        receivedOrdersValue,
        pendingStores,
        pendingProducts,
        reviewsTotal: reviewAgg.total,
        reviewsAverage: reviewAgg.average,
        storesByDistrict,
        topGIBrands,
        codOrders,
        codDelivered,
        skuMetrics,
      };
      res.json(analytics);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  app.get('/api/admin/platform/settings', isAuthenticated, isAdmin, async (_req: any, res) => {
    try {
      await ensureTaxShipSchema();
      const rows = await db.select().from(platformSettings);
      const current = rows[0] || { id: 'default', taxEnabled: true, shippingEnabled: true } as any;
      res.json(current);
    } catch (error) {
      console.error('Admin settings fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  app.put('/api/admin/platform/settings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await ensureTaxShipSchema();
      const { taxEnabled, shippingEnabled } = req.body || {};
      const updates: any = { updatedAt: new Date() as any };
      if (typeof taxEnabled === 'boolean') updates.taxEnabled = taxEnabled;
      if (typeof shippingEnabled === 'boolean') updates.shippingEnabled = shippingEnabled;
      const [updated] = await db
        .update(platformSettings)
        .set(updates)
        .where(eq(platformSettings.id, 'default'))
        .returning();
      try {
        await db.insert(configAudits).values({
          entityType: 'platform_settings',
          entityId: 'default',
          action: 'update',
          changes: updates,
          changedBy: req.userId,
        } as any);
      } catch { }
      res.json(updated);
    } catch (error) {
      console.error('Admin settings update error:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  app.get('/api/admin/tax-rules', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      await ensureTaxShipSchema();
      const rules = await db.select().from(taxRules);
      res.json(rules);
    } catch (error) {
      console.error('Admin list tax rules error:', error);
      res.status(500).json({ message: 'Failed to list tax rules' });
    }
  });

  app.post('/api/admin/tax-rules', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await ensureTaxShipSchema();
      const payload = req.body || {};
      const [created] = await db.insert(taxRules).values({
        enabled: payload.enabled !== false,
        category: payload.category || null,
        province: payload.province || null,
        rate: String(payload.rate ?? '0'),
        exempt: !!payload.exempt,
        priority: Number(payload.priority ?? 0),
        createdBy: req.userId,
      } as any).returning();
      try {
        await db.insert(configAudits).values({
          entityType: 'tax_rule',
          entityId: created.id as any,
          action: 'create',
          changes: payload,
          changedBy: req.userId,
        } as any);
      } catch { }
      res.status(201).json(created);
    } catch (error) {
      console.error('Admin create tax rule error:', error);
      res.status(500).json({ message: 'Failed to create tax rule' });
    }
  });

  app.put('/api/admin/tax-rules/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await ensureTaxShipSchema();
      const id = req.params.id;
      const payload = req.body || {};
      const updates: any = {};
      if (payload.enabled != null) updates.enabled = !!payload.enabled;
      if (payload.category != null) updates.category = String(payload.category);
      if (payload.province != null) updates.province = String(payload.province);
      if (payload.rate != null) updates.rate = String(payload.rate);
      if (payload.exempt != null) updates.exempt = !!payload.exempt;
      if (payload.priority != null) updates.priority = Number(payload.priority);
      const [updated] = await db.update(taxRules).set(updates).where(eq(taxRules.id, id)).returning();
      try {
        await db.insert(configAudits).values({
          entityType: 'tax_rule',
          entityId: id,
          action: 'update',
          changes: updates,
          changedBy: req.userId,
        } as any);
      } catch { }
      res.json(updated);
    } catch (error) {
      console.error('Admin update tax rule error:', error);
      res.status(500).json({ message: 'Failed to update tax rule' });
    }
  });

  app.delete('/api/admin/tax-rules/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await ensureTaxShipSchema();
      const id = req.params.id;
      await db.delete(taxRules).where(eq(taxRules.id, id));
      try {
        await db.insert(configAudits).values({
          entityType: 'tax_rule',
          entityId: id,
          action: 'delete',
          changes: null as any,
          changedBy: req.userId,
        } as any);
      } catch { }
      res.json({ deleted: id });
    } catch (error) {
      console.error('Admin delete tax rule error:', error);
      res.status(500).json({ message: 'Failed to delete tax rule' });
    }
  });

  app.get('/api/admin/shipping-rate-rules', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      await ensureTaxShipSchema();
      const rules = await db.select().from(shippingRateRules);
      res.json(rules);
    } catch (error) {
      console.error('Admin list shipping rate rules error:', error);
      res.status(500).json({ message: 'Failed to list shipping rate rules' });
    }
  });

  app.post('/api/admin/shipping-rate-rules', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await ensureTaxShipSchema();
      const payload = req.body || {};
      const [created] = await db.insert(shippingRateRules).values({
        enabled: payload.enabled !== false,
        carrier: String(payload.carrier ?? 'internal'),
        method: String(payload.method ?? 'standard'),
        zone: String(payload.zone ?? 'PK'),
        minWeightKg: String(payload.minWeightKg ?? '0'),
        maxWeightKg: String(payload.maxWeightKg ?? '999'),
        baseRate: String(payload.baseRate ?? '0'),
        perKgRate: String(payload.perKgRate ?? '0'),
        dimensionalFactor: payload.dimensionalFactor != null ? String(payload.dimensionalFactor) : null,
        surcharge: payload.surcharge != null ? String(payload.surcharge) : null,
        priority: Number(payload.priority ?? 0),
        createdBy: req.userId,
      } as any).returning();
      try {
        await db.insert(configAudits).values({
          entityType: 'shipping_rate_rule',
          entityId: created.id as any,
          action: 'create',
          changes: payload,
          changedBy: req.userId,
        } as any);
      } catch { }
      res.status(201).json(created);
    } catch (error) {
      console.error('Admin create shipping rate rule error:', error);
      res.status(500).json({ message: 'Failed to create shipping rate rule' });
    }
  });

  app.put('/api/admin/shipping-rate-rules/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await ensureTaxShipSchema();
      const id = req.params.id;
      const payload = req.body || {};
      const updates: any = {};
      if (payload.enabled != null) updates.enabled = !!payload.enabled;
      if (payload.carrier != null) updates.carrier = String(payload.carrier);
      if (payload.method != null) updates.method = String(payload.method);
      if (payload.zone != null) updates.zone = String(payload.zone);
      if (payload.minWeightKg != null) updates.minWeightKg = String(payload.minWeightKg);
      if (payload.maxWeightKg != null) updates.maxWeightKg = String(payload.maxWeightKg);
      if (payload.baseRate != null) updates.baseRate = String(payload.baseRate);
      if (payload.perKgRate != null) updates.perKgRate = String(payload.perKgRate);
      if (payload.dimensionalFactor != null) updates.dimensionalFactor = String(payload.dimensionalFactor);
      if (payload.surcharge != null) updates.surcharge = String(payload.surcharge);
      if (payload.priority != null) updates.priority = Number(payload.priority);
      const [updated] = await db.update(shippingRateRules).set(updates).where(eq(shippingRateRules.id, id)).returning();
      try {
        await db.insert(configAudits).values({
          entityType: 'shipping_rate_rule',
          entityId: id,
          action: 'update',
          changes: updates,
          changedBy: req.userId,
        } as any);
      } catch { }
      res.json(updated);
    } catch (error) {
      console.error('Admin update shipping rate rule error:', error);
      res.status(500).json({ message: 'Failed to update shipping rate rule' });
    }
  });

  app.delete('/api/admin/shipping-rate-rules/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await ensureTaxShipSchema();
      const id = req.params.id;
      await db.delete(shippingRateRules).where(eq(shippingRateRules.id, id));
      try {
        await db.insert(configAudits).values({
          entityType: 'shipping_rate_rule',
          entityId: id,
          action: 'delete',
          changes: null as any,
          changedBy: req.userId,
        } as any);
      } catch { }
      res.json({ deleted: id });
    } catch (error) {
      console.error('Admin delete shipping rate rule error:', error);
      res.status(500).json({ message: 'Failed to delete shipping rate rule' });
    }
  });

  app.get('/api/admin/reviews', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = (req.query.status as string) || 'pending';
      // Simple fetch of pending reviews
      // Reuse storage.getReviewsByProduct across all products by fetching products first
      const { products } = await storage.getAllProducts({ status: 'approved' });
      const all: any[] = [];
      for (const p of products) {
        const list = await storage.getReviewsByProduct(p.id, 'newest');
        all.push(...list);
      }
      const filtered = all.filter(r => r.status === status);
      res.json(filtered);
    } catch (error) {
      console.error('Admin reviews fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch reviews' });
    }
  });

  app.post('/api/admin/reviews/:id/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.execute(sql`UPDATE reviews SET status = 'approved' WHERE id = ${id}`);
      res.json({ ok: true });
    } catch (error) {
      console.error('Approve review error:', error);
      res.status(500).json({ message: 'Failed to approve review' });
    }
  });

  app.post('/api/admin/reviews/:id/reject', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.execute(sql`UPDATE reviews SET status = 'rejected' WHERE id = ${id}`);
      res.json({ ok: true });
    } catch (error) {
      console.error('Reject review error:', error);
      res.status(500).json({ message: 'Failed to reject review' });
    }
  });

  app.put('/api/admin/products/:id/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const updatedProduct = await storage.updateProductStatus(req.params.id, status);
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product status:", error);
      res.status(500).json({ message: "Failed to update product status" });
    }
  });

  app.get('/api/admin/orders', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });


  app.get('/api/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(sanitizeUser);
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:id/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { role } = req.body;
      if (!role || !['buyer', 'vendor', 'admin', 'trainee', 'artisan'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(req.params.id, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.get('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const safe = sanitizeUser(user);
      const permissions = Array.from(new Set([
        safe.role === 'admin' ? 'manage_users' : null,
        safe.role === 'admin' ? 'manage_products' : null,
        safe.role === 'admin' ? 'manage_orders' : null,
        safe.role === 'vendor' ? 'manage_store' : null,
        safe.role === 'vendor' ? 'manage_products' : null,
        'view_orders',
      ].filter(Boolean) as string[]));
      res.json({
        ...safe,
        permissions,
      });
    } catch (error) {
      console.error('Error fetching admin user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.put('/api/admin/users/:id/active', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { isActive } = req.body || {};
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive boolean required' });
      }
      const user = await storage.updateUserActiveStatus(req.params.id, !!isActive);
      if (!user) return res.status(404).json({ message: 'User not found' });
      try {
        await db.insert(configAudits).values({
          entityType: 'user',
          entityId: req.params.id,
          action: isActive ? 'activate' : 'deactivate',
          changes: { isActive },
          changedBy: req.userId,
        } as any);
      } catch { }
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error('Error updating user active:', error);
      res.status(500).json({ message: 'Failed to update user status' });
    }
  });

  app.post('/api/admin/users/:id/reset-password', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const target = await storage.getUser(req.params.id);
      if (!target) return res.status(404).json({ message: 'User not found' });
      const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
      const gen = (len: number) => Array.from({ length: len }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
      let temp = gen(12);
      const ensure = (s: string) => {
        if (!/[A-Z]/.test(s)) s = 'A' + s.slice(1);
        if (!/[a-z]/.test(s)) s = s.slice(0, -1) + 'a';
        if (!/[0-9]/.test(s)) s = s + '2';
        return s;
      };
      temp = ensure(temp);
      const hash = await hashPassword(temp);
      await storage.updatePassword(target.id, hash);
      try {
        await db.insert(configAudits).values({
          entityType: 'user',
          entityId: target.id,
          action: 'reset_password',
          changes: { byAdmin: req.userId },
          changedBy: req.userId,
        } as any);
      } catch { }
      res.json({ tempPassword: temp });
    } catch (error) {
      console.error('Error resetting user password:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  const resetVendorPasswordSchema = z.object({
    storeId: z.string().optional(),
    storeName: z.string().optional(),
    newPassword: registerSchema.shape.password,
  }).refine((data) => !!data.storeId || !!data.storeName, {
    message: "Provide either storeId or storeName",
    path: ["storeId"],
  });

  app.post('/api/admin/stores/reset-vendor-password', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const parsed = resetVendorPasswordSchema.parse(req.body);

      let targetStore: any | undefined;
      if (parsed.storeId) {
        targetStore = await storage.getStore(parsed.storeId);
      } else if (parsed.storeName) {
        const allStores = await storage.getAllStores();
        targetStore = allStores.find((s: any) => s.name === parsed.storeName);
      }

      if (!targetStore) {
        return res.status(404).json({ message: "Store not found" });
      }

      const vendor = await storage.getUser(targetStore.vendorId);
      if (!vendor) {
        return res.status(404).json({ message: "Vendor user not found" });
      }

      const hash = await hashPassword(parsed.newPassword);
      const updated = await storage.updatePassword(vendor.id, hash);
      if (!updated) {
        return res.status(500).json({ message: "Failed to update password" });
      }

      res.json({ ok: true });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Admin reset vendor password error:", error);
      res.status(500).json({ message: "Failed to reset vendor password" });
    }
  });

  // Messaging Routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error creating message:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/messages/conversation/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.userId;
      const otherUserId = req.params.userId;
      const messages = await storage.getMessagesBetweenUsers(currentUserId, otherUserId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const messages = await storage.getMessagesForUser(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.put('/api/messages/read', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.userId;
      const { otherUserId, orderId } = req.body as { otherUserId: string; orderId?: string };
      if (!otherUserId) return res.status(400).json({ message: 'otherUserId required' });
      const msgs = await storage.getMessagesBetweenUsers(currentUserId, otherUserId);
      const targets = msgs.filter(m => !m.read && m.receiverId === currentUserId && (!orderId || m.orderId === orderId));
      for (const m of targets) {
        await storage.markMessageAsRead(m.id);
      }
      res.json({ marked: targets.length });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ message: 'Failed to mark messages as read' });
    }
  });

  // Payout Routes
  app.post('/api/payouts', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const validatedData = insertPayoutSchema.parse({
        ...req.body,
        vendorId: req.userId,
      });
      const payout = await storage.createPayout(validatedData);
      res.status(201).json(payout);
    } catch (error: any) {
      console.error("Error creating payout:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid payout data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payout" });
    }
  });

  app.get('/api/vendor/payouts', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const payouts = await storage.getPayoutsByVendor(req.userId);
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });

  app.get('/api/training/centers', async (_req, res) => {
    try {
      const centers = await storage.getTrainingCenters();
      res.json(centers);
    } catch {
      res.status(500).json({ message: 'Failed to fetch centers' });
    }
  });

  app.post('/api/admin/training/centers', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const payload = insertTrainingCenterSchema.parse(req.body);
      const center = await storage.createTrainingCenter(payload);
      res.status(201).json(center);
    } catch (error: any) {
      const msg = (error && error.message) || 'Failed to create center';
      res.status(500).json({ message: msg });
    }
  });

  app.put('/api/admin/training/centers/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const updates = insertTrainingCenterSchema.partial().parse(req.body);
      const updated = await storage.updateTrainingCenter(req.params.id, updates);
      if (!updated) return res.status(404).json({ message: 'Center not found' });
      res.json(updated);
    } catch (error: any) {
      const msg = (error && error.message) || 'Failed to update center';
      res.status(500).json({ message: msg });
    }
  });

  app.get('/api/training/programs', async (_req, res) => {
    try {
      const programs = await storage.getTrainingPrograms();
      res.json(programs);
    } catch {
      res.status(500).json({ message: 'Failed to fetch programs' });
    }
  });

  app.post('/api/admin/training/programs', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const payload = insertTrainingProgramSchema.parse(req.body);
      const program = await storage.createTrainingProgram(payload);
      res.status(201).json(program);
    } catch (error: any) {
      const msg = (error && error.message) || 'Failed to create program';
      res.status(500).json({ message: msg });
    }
  });

  app.put('/api/admin/training/programs/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const updates = insertTrainingProgramSchema.partial().parse(req.body);
      const updated = await storage.updateTrainingProgram(req.params.id, updates);
      if (!updated) return res.status(404).json({ message: 'Program not found' });
      res.json(updated);
    } catch (error: any) {
      const msg = (error && error.message) || 'Failed to update program';
      res.status(500).json({ message: msg });
    }
  });

  app.get('/api/training/applications/me', isAuthenticated, async (req: any, res) => {
    try {
      const list = await storage.getTraineeApplicationsByUser(req.userId);
      res.json(list);
    } catch {
      res.status(500).json({ message: 'Failed to fetch applications' });
    }
  });

  app.post('/api/training/applications', isAuthenticated, async (req: any, res) => {
    try {
      const payload = insertTraineeApplicationSchema.parse({ ...req.body, userId: req.userId });
      const created = await storage.createTraineeApplication(payload);
      res.status(201).json(created);
    } catch (error: any) {
      const msg = (error && error.message) || 'Failed to apply';
      res.status(500).json({ message: msg });
    }
  });

  app.get('/api/admin/training/applications', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const programId = String(req.query.programId || '');
      const list = programId ? await storage.getTraineeApplicationsByProgram(programId) : [];
      res.json(list);
    } catch {
      res.status(500).json({ message: 'Failed to fetch applications' });
    }
  });

  app.put('/api/admin/training/applications/:id/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const status = String((req.body || {}).status || '');
      if (!status) return res.status(400).json({ message: 'status required' });
      const timestamps: any = {};
      if (status === 'accepted') timestamps.acceptedAt = new Date();
      if (status === 'enrolled') timestamps.enrolledAt = new Date();
      if (status === 'completed') timestamps.completedAt = new Date();
      const updated = await storage.updateTraineeApplicationStatus(req.params.id, status, timestamps);
      if (!updated) return res.status(404).json({ message: 'Application not found' });
      res.json(updated);
    } catch {
      res.status(500).json({ message: 'Failed to update status' });
    }
  });

  app.get('/api/training/progress/:applicationId', isAuthenticated, async (req: any, res) => {
    try {
      const appId = req.params.applicationId;
      const apps = await storage.getTraineeApplicationsByUser(req.userId);
      const owns = apps.some(a => a.id === appId);
      if (!owns) return res.status(403).json({ message: 'Not authorized' });
      const prog = await storage.getTraineeProgressByApplication(appId);
      res.json(prog || null);
    } catch {
      res.status(500).json({ message: 'Failed to fetch progress' });
    }
  });

  app.put('/api/admin/training/progress/:applicationId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const appId = req.params.applicationId;
      const data = insertTraineeProgressSchema.parse({ ...req.body, applicationId: appId });
      const updated = await storage.upsertTraineeProgress(appId, { milestones: data.milestones, completionPercent: data.completionPercent, attendancePercent: data.attendancePercent, grade: data.grade });
      res.json(updated);
    } catch (error: any) {
      const msg = (error && error.message) || 'Failed to update progress';
      res.status(500).json({ message: msg });
    }
  });

  app.get('/api/training/work/me', isAuthenticated, async (req: any, res) => {
    try {
      const list = await storage.getArtisanWorkByUser(req.userId);
      res.json(list);
    } catch {
      res.status(500).json({ message: 'Failed to fetch work' });
    }
  });

  app.get('/api/admin/training/work', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const rows = await db.select().from(artisanWork).orderBy(desc(artisanWork.assignedAt));
      res.json(rows);
    } catch {
      res.status(500).json({ message: 'Failed to fetch work' });
    }
  });

  app.put('/api/training/work/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const workId = req.params.id;
      const myWork = await storage.getArtisanWorkByUser(req.userId);
      const target = myWork.find(w => w.id === workId);
      if (!target) return res.status(403).json({ message: 'Not authorized' });
      const updated = await storage.updateArtisanWorkStatus(workId, 'completed', { completedAt: new Date() as any });
      res.json(updated);
    } catch {
      res.status(500).json({ message: 'Failed to update work' });
    }
  });

  app.put('/api/admin/training/work/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const workId = req.params.id;
      const rows = await db.select().from(artisanWork).where(eq(artisanWork.id, workId));
      const work = rows[0] as any;
      if (!work) return res.status(404).json({ message: 'Work not found' });
      const updated = await storage.updateArtisanWorkStatus(workId, 'approved', { approvedAt: new Date() as any });
      const payout = await storage.createPayout({ vendorId: work.workerId, amount: work.amount, status: 'pending' } as any);
      await storage.linkPayoutToArtisanWork(workId, payout.id);
      res.json({ work: updated, payout });
    } catch {
      res.status(500).json({ message: 'Failed to approve work' });
    }
  });

  // Secure seed endpoint for production database initialization
  app.post('/api/admin/seed', async (req, res) => {
    try {
      // Verify secret token
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token || token !== process.env.SEED_SECRET) {
        return res.status(401).json({ message: "Unauthorized - Invalid seed token" });
      }

      // Import and run seed function
      const { seed } = await import('./seed.js');
      await seed();

      res.json({
        success: true,
        message: "Database seeded successfully"
      });
    } catch (error: any) {
      console.error("Error seeding database:", error);
      res.status(500).json({
        success: false,
        message: "Failed to seed database",
        error: error.message
      });
    }
  });

  // ===== ARTISAN TRAINING MODULE API ROUTES =====

  // Get all Sanatzar centers
  app.get('/api/sanatzar-centers', async (req, res) => {
    try {
      const rows = await db.select().from(sanatzarCenters).orderBy(sanatzarCenters.district);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching centers:", error);
      res.status(500).json({ message: "Failed to fetch centers" });
    }
  });

  // Get single center
  app.get('/api/sanatzar-centers/:id', async (req, res) => {
    try {
      const [center] = await db.select().from(sanatzarCenters).where(eq(sanatzarCenters.id, req.params.id));
      if (!center) return res.status(404).json({ message: "Center not found" });
      res.json(center);
    } catch (error) {
      console.error("Error fetching center:", error);
      res.status(500).json({ message: "Failed to fetch center" });
    }
  });

  // Get all training programs
  app.get('/api/training-programs', async (req, res) => {
    try {
      const { status, centerId } = req.query;
      let query = db.select().from(trainingPrograms);
      const conditions = [];
      if (status) conditions.push(eq(trainingPrograms.status, status as string));
      if (centerId) conditions.push(eq(trainingPrograms.centerId, centerId as string));
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      const rows = await query;
      res.json(rows);
    } catch (error) {
      console.error("Error fetching programs:", error);
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  // Get single program
  app.get('/api/training-programs/:id', async (req, res) => {
    try {
      const [program] = await db.select().from(trainingPrograms).where(eq(trainingPrograms.id, req.params.id));
      if (!program) return res.status(404).json({ message: "Program not found" });
      res.json(program);
    } catch (error) {
      console.error("Error fetching program:", error);
      res.status(500).json({ message: "Failed to fetch program" });
    }
  });

  // Get survey questions
  app.get('/api/survey-questions/:type', async (req, res) => {
    try {
      const rows = await db.select().from(surveyQuestions)
        .where(and(eq(surveyQuestions.type, req.params.type), eq(surveyQuestions.isActive, true)))
        .orderBy(surveyQuestions.order);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching survey questions:", error);
      res.status(500).json({ message: "Failed to fetch survey questions" });
    }
  });

  // Submit training application
  app.post('/api/training-applications', async (req, res) => {
    try {
      const data = req.body;
      const [application] = await db.insert(trainingApplications).values({
        programId: data.programId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        cnic: data.cnic || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address,
        city: data.city,
        district: data.district,
        education: data.education || null,
        priorCraftExperience: data.priorCraftExperience || null,
        motivation: data.motivation,
        surveyResponses: data.surveyResponses || null,
      }).returning();
      res.status(201).json(application);
    } catch (error) {
      console.error("Error submitting training application:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Submit artisan registration
  app.post('/api/artisan-registrations', async (req, res) => {
    try {
      const data = req.body;
      const [registration] = await db.insert(registeredArtisans).values({
        centerId: data.centerId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        cnic: data.cnic || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        address: data.address,
        city: data.city,
        district: data.district,
        bio: data.bio || null,
        education: data.education || null,
        languages: data.languages || null,
        primaryCraft: data.primaryCraft,
        craftsKnown: data.craftsKnown || null,
        skillLevel: data.skillLevel,
        yearsExperience: data.yearsExperience ? parseInt(data.yearsExperience) : null,
        workPreference: data.workPreference,
        preferredCenterId: data.centerId,
        availabilityHours: data.availabilityHours ? parseInt(data.availabilityHours) : null,
        availableDays: data.availableDays || null,
        paymentMethod: data.paymentMethod || null,
        paymentDetails: data.paymentDetails ? { account: data.paymentDetails } : null,
        surveyResponses: data.surveyResponses || null,
      }).returning();
      res.status(201).json(registration);
    } catch (error) {
      console.error("Error submitting artisan registration:", error);
      res.status(500).json({ message: "Failed to submit registration" });
    }
  });

  // Admin: Get all training applications
  app.get('/api/admin/training-applications', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const rows = await db.select().from(trainingApplications).orderBy(desc(trainingApplications.appliedAt));
      res.json(rows);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Admin: Get all registered artisans
  app.get('/api/admin/registered-artisans', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const rows = await db.select().from(registeredArtisans).orderBy(desc(registeredArtisans.registeredAt));
      res.json(rows);
    } catch (error) {
      console.error("Error fetching artisans:", error);
      res.status(500).json({ message: "Failed to fetch artisans" });
    }
  });

  // Admin: CRUD for centers
  app.post('/api/admin/sanatzar-centers', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const [center] = await db.insert(sanatzarCenters).values(req.body).returning();
      res.status(201).json(center);
    } catch (error) {
      console.error("Error creating center:", error);
      res.status(500).json({ message: "Failed to create center" });
    }
  });

  app.put('/api/admin/sanatzar-centers/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const [center] = await db.update(sanatzarCenters).set(req.body).where(eq(sanatzarCenters.id, req.params.id)).returning();
      res.json(center);
    } catch (error) {
      console.error("Error updating center:", error);
      res.status(500).json({ message: "Failed to update center" });
    }
  });

  app.delete('/api/admin/sanatzar-centers/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await db.delete(sanatzarCenters).where(eq(sanatzarCenters.id, req.params.id));
      res.json({ message: "Center deleted" });
    } catch (error) {
      console.error("Error deleting center:", error);
      res.status(500).json({ message: "Failed to delete center" });
    }
  });

  // Admin: CRUD for Categories (Districts)
  app.get('/api/categories', async (req, res) => {
    try {
      const rows = await db.select().from(categories).orderBy(categories.district);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/admin/categories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const [category] = await db.insert(categories).values(req.body).returning();
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const [category] = await db.update(categories).set(req.body).where(eq(categories.id, req.params.id)).returning();
      res.json(category);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await db.delete(categories).where(eq(categories.id, req.params.id));
      res.json({ message: "Category deleted" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Admin: CRUD for training programs
  app.post('/api/admin/training-programs', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const [program] = await db.insert(trainingPrograms).values(req.body).returning();
      res.status(201).json(program);
    } catch (error) {
      console.error("Error creating program:", error);
      res.status(500).json({ message: "Failed to create program" });
    }
  });

  app.put('/api/admin/training-programs/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const [program] = await db.update(trainingPrograms).set(req.body).where(eq(trainingPrograms.id, req.params.id)).returning();
      res.json(program);
    } catch (error) {
      console.error("Error updating program:", error);
      res.status(500).json({ message: "Failed to update program" });
    }
  });

  // Admin: Approve/reject training application
  app.put('/api/admin/training-applications/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status, adminNotes } = req.body;
      const [application] = await db.update(trainingApplications)
        .set({ status, adminNotes, processedAt: new Date(), processedBy: req.userId })
        .where(eq(trainingApplications.id, req.params.id))
        .returning();
      res.json(application);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Admin: Approve/reject artisan registration
  app.put('/api/admin/registered-artisans/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      const updates: any = { status };
      if (status === 'active') {
        updates.approvedAt = new Date();
        updates.approvedBy = req.userId;
      }
      const [artisan] = await db.update(registeredArtisans)
        .set(updates)
        .where(eq(registeredArtisans.id, req.params.id))
        .returning();
      res.json(artisan);
    } catch (error) {
      console.error("Error updating artisan:", error);
      res.status(500).json({ message: "Failed to update artisan" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
