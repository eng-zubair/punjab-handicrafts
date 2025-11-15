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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, gte, lte, desc, asc, count, inArray } from "drizzle-orm";

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

  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByBuyer(buyerId: string): Promise<Order[]>;
  getOrdersByStore(storeId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  // Order Item operations
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  getOrderItemsWithProductsForOrders(orderIds: string[]): Promise<Record<string, Array<OrderItem & { product: Product | null }>>>;

  // Category operations
  createCategory(category: InsertCategory): Promise<Category>;
  getAllCategories(): Promise<Category[]>;
  getCategoryByDistrict(district: string): Promise<Category | undefined>;

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
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    status?: string;
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

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(products)
      .where(whereClause);

    const baseQuery = whereClause 
      ? db.select().from(products).where(whereClause)
      : db.select().from(products);

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
}

export const storage = new DatabaseStorage();
