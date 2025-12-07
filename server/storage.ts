import {
  users,
  stores,
  products,
  orders,
  orderItems,
  categories,
  messages,
  subscriptions,
  transactions,
  payouts,
  productGroups,
  productGroupMembers,
  promotions,
  promotionProducts,
  promotionProductHistory,
  reviews,
  reviewMedia,
  reviewVotes,
  productCategories,
  type User,
  type UpsertUser,
  type InsertStore,
  type Store,
  type InsertProduct,
  type Product,
  type InsertOrder,
  type Order,
  type InsertOrderItem,
  type OrderItem,
  type InsertCategory,
  type Category,
  type InsertProductCategory,
  type ProductCategory,
  type InsertMessage,
  type Message,
  type InsertSubscription,
  type Subscription,
  type InsertTransaction,
  type Transaction,
  type InsertPayout,
  type Payout,
  type InsertProductGroup,
  type ProductGroup,
  type InsertProductGroupMember,
  type ProductGroupMember,
  type InsertPromotion,
  type Promotion,
  type InsertPromotionProduct,
  type PromotionProduct,
  type Review,
  type InsertReview,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, gte, lte, desc, asc, count, inArray, sql } from "drizzle-orm";

// Utility function to normalize image paths to start with /
function normalizeImagePath(path: string): string {
  if (!path) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

// Utility function to normalize product image arrays
function normalizeProductImages(product: Product): Product {
  return {
    ...product,
    images: product.images ? product.images.map(normalizeImagePath) : []
  };
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(userData: { email: string; passwordHash: string; firstName: string; lastName: string }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updatePassword(userId: string, passwordHash: string): Promise<User | undefined>;
  updateUserActiveStatus(id: string, isActive: boolean): Promise<User | undefined>;
  updateUserLastLogin(id: string, lastLogin: Date): Promise<User | undefined>;
  updateVerificationToken(userId: string, token: string | null): Promise<User | undefined>;
  updatePasswordResetToken(userId: string, token: string | null, expires: Date | null): Promise<User | undefined>;

  // Store operations
  createStore(store: InsertStore): Promise<Store>;
  getStore(id: string): Promise<Store | undefined>;
  getStoresByVendor(vendorId: string): Promise<Store[]>;
  getAllStores(status?: string): Promise<Store[]>;
  updateStore(id: string, updates: Partial<InsertStore>): Promise<Store | undefined>;
  updateStoreStatus(id: string, status: string): Promise<Store | undefined>;

  // Product operations
  createProduct(product: InsertProduct): Promise<Product>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByStore(storeId: string): Promise<Product[]>;
  getAllProducts(filters?: {
    district?: string;
    giBrand?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ products: Product[], total: number }>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  updateProductStatus(id: string, status: string): Promise<Product | undefined>;
  updateProductActiveStatus(id: string, isActive: boolean): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  // Product Group operations
  createProductGroup(group: InsertProductGroup): Promise<ProductGroup>;
  getProductGroup(id: string): Promise<ProductGroup | undefined>;
  getProductGroupsByStore(storeId: string): Promise<ProductGroup[]>;
  updateProductGroup(id: string, updates: Partial<InsertProductGroup>): Promise<ProductGroup | undefined>;
  deleteProductGroup(id: string): Promise<void>;
  addProductToGroup(groupId: string, productId: string, position?: number): Promise<ProductGroupMember>;
  removeProductFromGroup(groupId: string, productId: string): Promise<void>;
  getProductGroupMembers(groupId: string): Promise<ProductGroupMember[]>;

  // Promotion operations
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  getPromotion(id: string): Promise<Promotion | undefined>;
  getPromotionsByStore(storeId: string): Promise<Promotion[]>;
  updatePromotion(id: string, updates: Partial<InsertPromotion>): Promise<Promotion | undefined>;
  deletePromotion(id: string): Promise<void>;
  addProductToPromotion(promotionId: string, productId: string): Promise<PromotionProduct>;
  removeProductFromPromotion(promotionId: string, productId: string): Promise<void>;
  getPromotionProducts(promotionId: string): Promise<PromotionProduct[]>;
  getPromotionProductsWithDetails(promotionId: string): Promise<(PromotionProduct & { product: Product })[]>;
  getPromotionStatsForPromotions(promotionIds: string[]): Promise<Record<string, { productCount: number; lastAddedAt: string | null; lastRemovedAt: string | null }>>;
  getPromotionProductsByStoreWithPromotions(storeId: string): Promise<(PromotionProduct & { promotion: Promotion })[]>;

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByBuyer(buyerId: string): Promise<Order[]>;
  getOrdersByStore(storeId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderMeta(id: string, updates: Partial<InsertOrder>): Promise<Order | undefined>;

  // Order Item operations
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  getOrderItemsWithProductsForOrders(orderIds: string[]): Promise<Record<string, Array<OrderItem & { product: Product | null }>>>;

  // Category operations
  createCategory(category: InsertCategory): Promise<Category>;
  getAllCategories(): Promise<Category[]>;
  getCategoryByDistrict(district: string): Promise<Category | undefined>;

  // Product Category operations
  createProductCategory(category: InsertProductCategory): Promise<ProductCategory>;
  getAllProductCategories(): Promise<ProductCategory[]>;
  updateProductCategory(id: string, updates: Partial<InsertProductCategory>): Promise<ProductCategory | undefined>;
  deleteProductCategory(id: string): Promise<void>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(userId1: string, userId2: string): Promise<Message[]>;
  getMessagesForUser(userId: string): Promise<Message[]>;
  markMessageAsRead(id: string): Promise<Message | undefined>;

  // Subscription operations
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscriptionByVendor(vendorId: string): Promise<Subscription | undefined>;
  updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByStore(storeId: string): Promise<Transaction[]>;
  getTransactionsByOrder(orderId: string): Promise<Transaction[]>;

  // Payout operations
  createPayout(payout: InsertPayout): Promise<Payout>;
  getPayoutsByVendor(vendorId: string): Promise<Payout[]>;
  updatePayoutStatus(id: string, status: string, processedAt?: Date): Promise<Payout | undefined>;

  createReview(data: InsertReview & { verifiedPurchase: boolean; status: string }): Promise<Review>;
  getReviewsByProduct(productId: string, sort: "newest" | "highest" | "helpful"): Promise<Review[]>;
  addReviewMedia(reviewId: string, url: string, type: string): Promise<void>;
  upsertReviewVote(reviewId: string, userId: string, value: 1 | -1): Promise<{ helpfulUp: number; helpfulDown: number }>;
  getReviewStats(productId: string): Promise<{ count: number; average: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(userData: { email: string; passwordHash: string; firstName: string; lastName: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: "buyer",
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserActiveStatus(id: string, isActive: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserLastLogin(id: string, lastLogin: Date): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ lastLogin, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateVerificationToken(userId: string, token: string | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ verificationToken: token, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updatePasswordResetToken(userId: string, token: string | null, expires: Date | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        passwordResetToken: token, 
        passwordResetExpires: expires,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Store operations
  async createStore(store: InsertStore): Promise<Store> {
    const [newStore] = await db.insert(stores).values(store).returning();
    return newStore;
  }

  async getStore(id: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async getStoresByVendor(vendorId: string): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.vendorId, vendorId));
  }

  async getAllStores(status?: string): Promise<Store[]> {
    if (status) {
      return await db.select().from(stores).where(eq(stores.status, status));
    }
    return await db.select().from(stores);
  }

  async updateStore(id: string, updates: Partial<InsertStore>): Promise<Store | undefined> {
    const [store] = await db
      .update(stores)
      .set(updates)
      .where(eq(stores.id, id))
      .returning();
    return store;
  }

  async updateStoreStatus(id: string, status: string): Promise<Store | undefined> {
    const [store] = await db
      .update(stores)
      .set({ status })
      .where(eq(stores.id, id))
      .returning();
    return store;
  }

  // Product operations
  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return normalizeProductImages(newProduct);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product ? normalizeProductImages(product) : undefined;
  }

  async getProductsByStore(storeId: string): Promise<Product[]> {
    const result = await db.select().from(products).where(eq(products.storeId, storeId));
    return result.map(normalizeProductImages);
  }

  async getAllProducts(filters?: {
    district?: string;
    giBrand?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    status?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ products: Product[], total: number }> {
    const conditions = [];
    if (filters?.district) {
      conditions.push(eq(products.district, filters.district));
    }
    if (filters?.giBrand) {
      conditions.push(eq(products.giBrand, filters.giBrand));
    }
    if (filters?.category) {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters?.minPrice !== undefined) {
      conditions.push(gte(products.price, filters.minPrice.toString()));
    }
    if (filters?.maxPrice !== undefined) {
      conditions.push(lte(products.price, filters.maxPrice.toString()));
    }
    if (filters?.search) {
      conditions.push(like(products.title, `%${filters.search}%`));
    }
    if (filters?.status) {
      conditions.push(eq(products.status, filters.status));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(products.isActive, filters.isActive));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(products)
      .where(whereClause);

    const baseQuery = whereClause 
      ? db
          .select()
          .from(products)
          .where(whereClause)
          .orderBy(desc(products.createdAt))
      : db
          .select()
          .from(products)
          .orderBy(desc(products.createdAt));

    if (filters?.page !== undefined && filters?.pageSize !== undefined) {
      const offset = (filters.page - 1) * filters.pageSize;
      const productList = await baseQuery.limit(filters.pageSize).offset(offset);
      return { products: productList.map(normalizeProductImages), total };
    }

    const productList = await baseQuery;
    
    return { products: productList.map(normalizeProductImages), total };
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return product ? normalizeProductImages(product) : undefined;
  }

  async updateProductStatus(id: string, status: string): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ status })
      .where(eq(products.id, id))
      .returning();
    return product ? normalizeProductImages(product) : undefined;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async updateProductActiveStatus(id: string, isActive: boolean): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ isActive })
      .where(eq(products.id, id))
      .returning();
    return product ? normalizeProductImages(product) : undefined;
  }

  // Product Group operations
  async createProductGroup(group: InsertProductGroup): Promise<ProductGroup> {
    const [newGroup] = await db.insert(productGroups).values(group).returning();
    return newGroup;
  }

  async getProductGroup(id: string): Promise<ProductGroup | undefined> {
    const [group] = await db.select().from(productGroups).where(eq(productGroups.id, id));
    return group;
  }

  async getProductGroupsByStore(storeId: string): Promise<ProductGroup[]> {
    return await db
      .select()
      .from(productGroups)
      .where(eq(productGroups.storeId, storeId))
      .orderBy(desc(productGroups.createdAt));
  }

  async updateProductGroup(id: string, updates: Partial<InsertProductGroup>): Promise<ProductGroup | undefined> {
    const [group] = await db
      .update(productGroups)
      .set(updates)
      .where(eq(productGroups.id, id))
      .returning();
    return group;
  }

  async deleteProductGroup(id: string): Promise<void> {
    await db.delete(productGroups).where(eq(productGroups.id, id));
  }

  async addProductToGroup(groupId: string, productId: string, position: number = 0): Promise<ProductGroupMember> {
    const [member] = await db
      .insert(productGroupMembers)
      .values({ groupId, productId, position })
      .returning();
    return member;
  }

  async removeProductFromGroup(groupId: string, productId: string): Promise<void> {
    await db
      .delete(productGroupMembers)
      .where(and(
        eq(productGroupMembers.groupId, groupId),
        eq(productGroupMembers.productId, productId)
      ));
  }

  async getProductGroupMembers(groupId: string): Promise<ProductGroupMember[]> {
    return await db
      .select()
      .from(productGroupMembers)
      .where(eq(productGroupMembers.groupId, groupId))
      .orderBy(asc(productGroupMembers.position));
  }

  // Promotion operations
  async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
    const [newPromotion] = await db.insert(promotions).values(promotion).returning();
    return newPromotion;
  }

  async getPromotion(id: string): Promise<Promotion | undefined> {
    const [promotion] = await db.select().from(promotions).where(eq(promotions.id, id));
    return promotion;
  }

  async getPromotionsByStore(storeId: string): Promise<Promotion[]> {
    return await db
      .select()
      .from(promotions)
      .where(eq(promotions.storeId, storeId))
      .orderBy(desc(promotions.createdAt));
  }

  async updatePromotion(id: string, updates: Partial<InsertPromotion>): Promise<Promotion | undefined> {
    const [promotion] = await db
      .update(promotions)
      .set(updates)
      .where(eq(promotions.id, id))
      .returning();
    return promotion;
  }

  async deletePromotion(id: string): Promise<void> {
    await db.delete(promotions).where(eq(promotions.id, id));
  }

  async addProductToPromotion(promotionId: string, productId: string): Promise<PromotionProduct> {
    const [promotionProduct] = await db
      .insert(promotionProducts)
      .values({ promotionId, productId })
      .returning();
    return promotionProduct;
  }

  async removeProductFromPromotion(promotionId: string, productId: string): Promise<void> {
    await db
      .delete(promotionProducts)
      .where(and(
        eq(promotionProducts.promotionId, promotionId),
        eq(promotionProducts.productId, productId)
      ));
  }

  async getPromotionProducts(promotionId: string): Promise<PromotionProduct[]> {
    return await db
      .select()
      .from(promotionProducts)
      .where(eq(promotionProducts.promotionId, promotionId));
  }

  async getPromotionProductsWithDetails(promotionId: string): Promise<(PromotionProduct & { product: Product })[]> {
    const rows = await db
      .select()
      .from(promotionProducts)
      .where(eq(promotionProducts.promotionId, promotionId));
    const productIds = rows.map(r => r.productId);
    const productsList = productIds.length ? await db.select().from(products).where(inArray(products.id, productIds)) : [];
    const map = new Map(productsList.map(p => [p.id, p]));
    return rows.map(r => ({ ...r, product: map.get(r.productId)! })).filter(r => r.product);
  }

  async getPromotionStatsForPromotions(promotionIds: string[]): Promise<Record<string, { productCount: number; lastAddedAt: string | null; lastRemovedAt: string | null }>> {
    if (!promotionIds || promotionIds.length === 0) return {};

    const countRows = await db
      .select({
        promotionId: promotionProducts.promotionId,
        productCount: count(promotionProducts.id),
        lastAddedAt: sql<string>`max(${promotionProducts.createdAt})`,
      })
      .from(promotionProducts)
      .where(inArray(promotionProducts.promotionId, promotionIds))
      .groupBy(promotionProducts.promotionId);

    const removeRows = await db
      .select({
        promotionId: promotionProductHistory.promotionId,
        lastRemovedAt: sql<string>`max(${promotionProductHistory.createdAt})`,
      })
      .from(promotionProductHistory)
      .where(and(inArray(promotionProductHistory.promotionId, promotionIds), eq(promotionProductHistory.changeType, 'remove')))
      .groupBy(promotionProductHistory.promotionId);

    const removeMap = new Map(removeRows.map(r => [r.promotionId as string, (r.lastRemovedAt as any) ? String(r.lastRemovedAt) : null]));

    const out: Record<string, { productCount: number; lastAddedAt: string | null; lastRemovedAt: string | null }> = {};
    for (const r of countRows as any[]) {
      const pid = String(r.promotionId);
      out[pid] = {
        productCount: Number(r.productCount) || 0,
        lastAddedAt: r.lastAddedAt ? String(r.lastAddedAt) : null,
        lastRemovedAt: removeMap.get(pid) || null,
      };
    }
    for (const pid of promotionIds) {
      if (!out[pid]) {
        out[pid] = { productCount: 0, lastAddedAt: null, lastRemovedAt: removeMap.get(pid) || null };
      }
    }
    return out;
  }

  async getPromotionProductsByStoreWithPromotions(storeId: string): Promise<(PromotionProduct & { promotion: Promotion })[]> {
    const promos = await this.getPromotionsByStore(storeId);
    const ids = promos.map(p => p.id);
    if (ids.length === 0) return [];
    const rows = await db
      .select()
      .from(promotionProducts)
      .where(inArray(promotionProducts.promotionId, ids));
    const map = new Map(promos.map(p => [p.id, p]));
    return rows.map(r => ({ ...r, promotion: map.get(r.promotionId)! })).filter(r => r.promotion);
  }

  async addProductsToPromotionBulk(
    promotionId: string,
    items: { productId: string; overridePrice?: string | null; quantityLimit?: number; conditions?: any }[],
  ): Promise<PromotionProduct[]> {
    if (!items || items.length === 0) return [];
    const insertValues = items.map(i => ({
      promotionId,
      productId: i.productId,
      overridePrice: i.overridePrice ?? null,
      quantityLimit: typeof i.quantityLimit === 'number' ? i.quantityLimit : 0,
      conditions: i.conditions ?? null,
    }));

    return await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(promotionProducts)
        .values(insertValues)
        .onConflictDoNothing()
        .returning();

      const historyValues = inserted.map(ip => ({
        promotionId: ip.promotionId,
        productId: ip.productId,
        changeType: 'add',
        changes: { overridePrice: ip.overridePrice, quantityLimit: ip.quantityLimit, conditions: ip.conditions },
        changedBy: '',
      }));

      return inserted;
    });
  }

  async removeProductsFromPromotionBulk(
    promotionId: string,
    productIds: string[],
  ): Promise<void> {
    if (!productIds || productIds.length === 0) return;
    await db.transaction(async (tx) => {
      await tx.delete(promotionProducts)
        .where(and(eq(promotionProducts.promotionId, promotionId), inArray(promotionProducts.productId, productIds)));
    });
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByBuyer(buyerId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.buyerId, buyerId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByStore(storeId: string): Promise<Order[]> {
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.storeId, storeId));
    
    const orderIdsSet = new Set<string>();
    items.forEach(item => orderIdsSet.add(item.orderId));
    const orderIds = Array.from(orderIdsSet);
    if (orderIds.length === 0) return [];
    
    return await db
      .select()
      .from(orders)
      .where(or(...orderIds.map(id => eq(orders.id, id))))
      .orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async updateOrderMeta(id: string, updates: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  // Order Item operations
  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db.insert(orderItems).values(item).returning();
    return newItem;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async getOrderItemsWithProductsForOrders(orderIds: string[]): Promise<Record<string, Array<OrderItem & { product: Product | null }>>> {
    if (orderIds.length === 0) {
      return {};
    }

    // Single query to fetch all order items with their products using LEFT JOIN
    const itemsWithProducts = await db
      .select({
        orderItem: orderItems,
        product: products,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(inArray(orderItems.orderId, orderIds));

    // Group items by orderId
    const grouped: Record<string, Array<OrderItem & { product: Product | null }>> = {};
    
    for (const row of itemsWithProducts) {
      const orderId = row.orderItem.orderId;
      if (!grouped[orderId]) {
        grouped[orderId] = [];
      }
      // Normalize product images first, keep price numeric (routes handle serialization)
      const normalizedProduct = row.product ? normalizeProductImages(row.product) : null;
      
      grouped[orderId].push({
        ...row.orderItem,
        price: String(row.orderItem.price), // Serialize price as string to match API contract
        product: normalizedProduct,
      });
    }

    return grouped;
  }

  // Category operations
  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategoryByDistrict(district: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.district, district));
    return category;
  }

  // Product Category operations
  async createProductCategory(category: InsertProductCategory): Promise<ProductCategory> {
    const [newCategory] = await db.insert(productCategories).values(category).returning();
    return newCategory;
  }

  async getAllProductCategories(): Promise<ProductCategory[]> {
    return await db.select().from(productCategories);
  }

  async updateProductCategory(id: string, updates: Partial<InsertProductCategory>): Promise<ProductCategory | undefined> {
    const [cat] = await db
      .update(productCategories)
      .set(updates)
      .where(eq(productCategories.id, id))
      .returning();
    return cat;
  }

  async deleteProductCategory(id: string): Promise<void> {
    await db.delete(productCategories).where(eq(productCategories.id, id));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  async getMessagesForUser(userId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));
  }

  async markMessageAsRead(id: string): Promise<Message | undefined> {
    const [message] = await db
      .update(messages)
      .set({ read: true })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  // Subscription operations
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }

  async getSubscriptionByVendor(vendorId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.vendorId, vendorId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription;
  }

  async updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [subscription] = await db
      .update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getTransactionsByStore(storeId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.storeId, storeId))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByOrder(orderId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.orderId, orderId));
  }

  // Payout operations
  async createPayout(payout: InsertPayout): Promise<Payout> {
    const [newPayout] = await db.insert(payouts).values(payout).returning();
    return newPayout;
  }

  async getPayoutsByVendor(vendorId: string): Promise<Payout[]> {
    return await db
      .select()
      .from(payouts)
      .where(eq(payouts.vendorId, vendorId))
      .orderBy(desc(payouts.requestedAt));
  }

  async updatePayoutStatus(id: string, status: string, processedAt?: Date): Promise<Payout | undefined> {
    const [payout] = await db
      .update(payouts)
      .set({ status, processedAt })
      .where(eq(payouts.id, id))
      .returning();
    return payout;
  }

  async createReview(data: InsertReview & { verifiedPurchase: boolean; status: string }): Promise<Review> {
    const [r] = await db
      .insert(reviews)
      .values({
        productId: data.productId,
        userId: data.userId,
        rating: data.rating,
        comment: data.comment,
        verifiedPurchase: data.verifiedPurchase,
        status: data.status,
      })
      .returning();
    return r as Review;
  }

  async getReviewsByProduct(productId: string, sort: "newest" | "highest" | "helpful"): Promise<Review[]> {
    let orderBy = desc(reviews.createdAt);
    if (sort === "highest") orderBy = desc(reviews.rating);
    if (sort === "helpful") orderBy = desc(sql`${reviews.helpfulUp} - ${reviews.helpfulDown}`);
    const list = await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .orderBy(orderBy);
    return list as Review[];
  }

  async addReviewMedia(reviewId: string, url: string, type: string): Promise<void> {
    await db.insert(reviewMedia).values({ reviewId, url, type });
  }

  async upsertReviewVote(reviewId: string, userId: string, value: 1 | -1): Promise<{ helpfulUp: number; helpfulDown: number }> {
    const existing = await db
      .select()
      .from(reviewVotes)
      .where(and(eq(reviewVotes.reviewId, reviewId), eq(reviewVotes.userId, userId)));
    if (existing.length === 0) {
      await db.insert(reviewVotes).values({ reviewId, userId, value });
      if (value === 1) await db.execute(sql`UPDATE reviews SET helpful_up = helpful_up + 1 WHERE id = ${reviewId}`);
      else await db.execute(sql`UPDATE reviews SET helpful_down = helpful_down + 1 WHERE id = ${reviewId}`);
    } else {
      const prev = existing[0].value;
      if (prev !== value) {
        await db.update(reviewVotes).set({ value }).where(eq(reviewVotes.id, existing[0].id));
        if (prev === 1 && value === -1) await db.execute(sql`UPDATE reviews SET helpful_up = helpful_up - 1, helpful_down = helpful_down + 1 WHERE id = ${reviewId}`);
        if (prev === -1 && value === 1) await db.execute(sql`UPDATE reviews SET helpful_down = helpful_down - 1, helpful_up = helpful_up + 1 WHERE id = ${reviewId}`);
      }
    }
    const rows = await db.select({ up: reviews.helpfulUp, down: reviews.helpfulDown }).from(reviews).where(eq(reviews.id, reviewId));
    const r = rows[0];
    return { helpfulUp: Number(r?.up ?? 0), helpfulDown: Number(r?.down ?? 0) };
  }

  async getReviewStats(productId: string): Promise<{ count: number; average: number }> {
    const rows = await db
      .select({ count: count(), avg: sql<number>`AVG(${reviews.rating})` })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")));
    const r = rows[0] as any;
    return { count: Number(r?.count ?? 0), average: Number(r?.avg ?? 0) };
  }

  async getReviewMedia(reviewId: string): Promise<{ url: string; type: string }[]> {
    const rows = await db.select().from(reviewMedia).where(eq(reviewMedia.reviewId, reviewId));
    return rows.map((m: any) => ({ url: m.url, type: m.type }));
  }

  async getPlatformReviewAnalytics(): Promise<{ total: number; average: number }> {
    const rows = await db
      .select({ count: count(), avg: sql<number>`AVG(${reviews.rating})` })
      .from(reviews)
      .where(eq(reviews.status, "approved"));
    const r = rows[0] as any;
    return { total: Number(r?.count ?? 0), average: Number(r?.avg ?? 0) };
  }
}

export const storage = new DatabaseStorage();
