import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  defaultShippingAddress: text("default_shipping_address"),
  notificationPrefs: jsonb("notification_prefs"),
  shippingPrefs: jsonb("shipping_prefs"),
  taxExempt: boolean("tax_exempt").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: varchar("verification_token"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  role: text("role").notNull().default("buyer"),
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stores = pgTable("stores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  district: text("district").notNull(),
  giBrands: text("gi_brands").array().notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  title: text("title").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  images: text("images").array().notNull(),
  district: text("district").notNull(),
  giBrand: text("gi_brand").notNull(),
  variants: text("variants"),
  category: text("category").notNull().default("general"),
  weightKg: decimal("weight_kg", { precision: 10, scale: 3 }),
  lengthCm: decimal("length_cm", { precision: 10, scale: 2 }),
  widthCm: decimal("width_cm", { precision: 10, scale: 2 }),
  heightCm: decimal("height_cm", { precision: 10, scale: 2 }),
  taxExempt: boolean("tax_exempt").notNull().default(false),
  status: text("status").notNull().default("pending"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  shippingAddress: text("shipping_address"),
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  shippingStreet: text("shipping_street"),
  shippingApartment: text("shipping_apartment"),
  shippingCity: text("shipping_city"),
  shippingPhone: varchar("shipping_phone"),
  shippingProvince: text("shipping_province"),
  shippingMethod: text("shipping_method"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
  shippingPostalCode: text("shipping_postal_code"),
  shippingCountry: text("shipping_country").default("Pakistan"),
  specialInstructions: text("special_instructions"),
  billingSameAsShipping: boolean("billing_same_as_shipping").default(true),
  billingStreet: text("billing_street"),
  billingApartment: text("billing_apartment"),
  billingCity: text("billing_city"),
  billingProvince: text("billing_province"),
  billingPostalCode: text("billing_postal_code"),
  billingCountry: text("billing_country").default("Pakistan"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  taxDetails: jsonb("tax_details"),
  preferredCommunication: text("preferred_communication"),
  processingEstimate: text("processing_estimate"),
  trackingNumber: text("tracking_number"),
  courierService: text("courier_service"),
  deliveryConfirmedAt: timestamp("delivery_confirmed_at"),
  codPaymentStatus: text("cod_payment_status"),
  codCollectedAt: timestamp("cod_collected_at"),
  codReceiptId: varchar("cod_receipt_id"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: text("cancelled_by"),
  cancelledAt: timestamp("cancelled_at"),
  paymentVerificationStatus: text("payment_verification_status"),
  paymentVerifiedAt: timestamp("payment_verified_at"),
  paymentReference: text("payment_reference"),
  reactivatedAt: timestamp("reactivated_at"),
  reactivatedBy: text("reactivated_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  district: text("district").notNull().unique(),
  giBrand: text("gi_brand").notNull(),
  crafts: text("crafts").array().notNull(),
});

// Product categories managed by Admin
export const productCategories = pgTable("product_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  tier: text("tier").notNull().default("basic"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("10.00"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull(),
  vendorEarnings: decimal("vendor_earnings", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const productGroups = pgTable("product_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productGroupMembers = pgTable("product_group_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => productGroups.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promotions = pgTable("promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeId: varchar("store_id").notNull().references(() => stores.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minQuantity: integer("min_quantity").default(1),
  appliesTo: text("applies_to").notNull(),
  targetId: varchar("target_id"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promotionProducts = pgTable("promotion_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promotionId: varchar("promotion_id").notNull().references(() => promotions.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  overridePrice: decimal("override_price", { precision: 10, scale: 2 }),
  quantityLimit: integer("quantity_limit").notNull().default(0),
  conditions: jsonb("conditions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promotionProductHistory = pgTable("promotion_product_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promotionId: varchar("promotion_id").notNull().references(() => promotions.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  changeType: text("change_type").notNull(),
  changes: jsonb("changes"),
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: decimal("rating", { precision: 2, scale: 1 }).notNull(),
  comment: text("comment").notNull(),
  verifiedPurchase: boolean("verified_purchase").notNull().default(false),
  helpfulUp: integer("helpful_up").notNull().default(0),
  helpfulDown: integer("helpful_down").notNull().default(0),
  status: text("status").notNull().default("approved"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviewMedia = pgTable("review_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().references(() => reviews.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviewVotes = pgTable("review_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().references(() => reviews.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  value: integer("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_review_vote_unique").on(table.reviewId, table.userId)
]);

export const PRODUCT_CATEGORIES = [
  "Clothing",
  "Stitched",
  "Unstitched",
  "Pottery",
  "Furniture",
  "Home Decor",
  "Jewelry",
  "Footwear",
  "Other"
] as const;

export const variantSchema = z.object({
  type: z.string().min(1, "Variant type is required"),
  option: z.string().min(1, "Variant option is required"),
  sku: z.string().min(1, "SKU is required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  stock: z.coerce.number().min(0, "Stock must be positive"),
});

export type Variant = z.infer<typeof variantSchema>;

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  status: true,
  isActive: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  read: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  requestedAt: true,
});

export const insertProductGroupSchema = createInsertSchema(productGroups).omit({
  id: true,
  createdAt: true,
});

export const insertProductGroupMemberSchema = createInsertSchema(productGroupMembers).omit({
  id: true,
  createdAt: true,
});

export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  createdAt: true,
});

export const insertPromotionProductSchema = createInsertSchema(promotionProducts).omit({
  id: true,
  createdAt: true,
});

export const insertPromotionProductHistorySchema = createInsertSchema(promotionProductHistory).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  helpfulUp: true,
  helpfulDown: true,
  verifiedPurchase: true,
  status: true,
});

export const insertReviewMediaSchema = createInsertSchema(reviewMedia).omit({
  id: true,
  createdAt: true,
});

export const insertReviewVoteSchema = createInsertSchema(reviewVotes).omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type ProductCategory = typeof productCategories.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;

export type InsertProductGroup = z.infer<typeof insertProductGroupSchema>;
export type ProductGroup = typeof productGroups.$inferSelect;

export type InsertProductGroupMember = z.infer<typeof insertProductGroupMemberSchema>;
export type ProductGroupMember = typeof productGroupMembers.$inferSelect;

export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type Promotion = typeof promotions.$inferSelect;

export type InsertPromotionProduct = z.infer<typeof insertPromotionProductSchema>;
export type PromotionProduct = typeof promotionProducts.$inferSelect;
export type InsertPromotionProductHistory = z.infer<typeof insertPromotionProductHistorySchema>;
export type PromotionProductHistory = typeof promotionProductHistory.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type InsertReviewMedia = z.infer<typeof insertReviewMediaSchema>;
export type ReviewMedia = typeof reviewMedia.$inferSelect;

export type InsertReviewVote = z.infer<typeof insertReviewVoteSchema>;
export type ReviewVote = typeof reviewVotes.$inferSelect;

// Authentication schemas with password validation
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default("default"),
  taxEnabled: boolean("tax_enabled").notNull().default(true),
  shippingEnabled: boolean("shipping_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taxRules = pgTable("tax_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enabled: boolean("enabled").notNull().default(true),
  category: text("category"),
  province: text("province"),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  exempt: boolean("exempt").notNull().default(false),
  priority: integer("priority").notNull().default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shippingRateRules = pgTable("shipping_rate_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enabled: boolean("enabled").notNull().default(true),
  carrier: text("carrier").notNull().default("internal"),
  method: text("method").notNull().default("standard"),
  zone: text("zone").notNull().default("PK"),
  minWeightKg: decimal("min_weight_kg", { precision: 10, scale: 3 }).notNull().default("0"),
  maxWeightKg: decimal("max_weight_kg", { precision: 10, scale: 3 }).notNull().default("999"),
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  perKgRate: decimal("per_kg_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  dimensionalFactor: decimal("dimensional_factor", { precision: 10, scale: 3 }),
  surcharge: decimal("surcharge", { precision: 10, scale: 2 }),
  priority: integer("priority").notNull().default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const configAudits = pgTable("config_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  action: text("action").notNull(),
  changes: jsonb("changes"),
  changedBy: varchar("changed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
