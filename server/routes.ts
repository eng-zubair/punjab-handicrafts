import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./auth";
import {
  insertStoreSchema,
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertMessageSchema,
  insertPayoutSchema,
  registerSchema,
  loginSchema,
  type User,
} from "@shared/schema";

// Helper function to remove sensitive fields from user objects
function sanitizeUser(user: User) {
  const { passwordHash, verificationToken, passwordResetToken, passwordResetExpires, ...safeUser } = user;
  return safeUser;
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Authentication
  await setupAuth(app);

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
          return res.status(500).json({ message: "Login failed" });
        }
        
        if (!user) {
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

          // Return user without sensitive fields
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
  app.get('/api/products', async (req, res) => {
    try {
      const { district, giBrand, minPrice, maxPrice, search, status = 'approved', page, pageSize } = req.query;
      
      const filters: any = { status };
      if (district) filters.district = district as string;
      if (giBrand) filters.giBrand = giBrand as string;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);
      if (search) filters.search = search as string;
      if (page) filters.page = Number(page);
      if (pageSize) filters.pageSize = Number(pageSize);

      const { products, total } = await storage.getAllProducts(filters);
      
      if (filters.page && filters.pageSize) {
        const totalPages = Math.ceil(total / filters.pageSize);
        res.json({
          products,
          pagination: {
            page: filters.page,
            pageSize: filters.pageSize,
            total,
            totalPages
          }
        });
      } else {
        res.json({ products, pagination: { total } });
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
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
      const stores = await storage.getStoresByVendor(req.userId);
      res.json(stores);
    } catch (error) {
      console.error("Error fetching vendor stores:", error);
      res.status(500).json({ message: "Failed to fetch stores" });
    }
  });

  // Vendor Product Management Routes
  app.post('/api/products', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const { storeId, ...productData } = req.body;
      const store = await storage.getStore(storeId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      if (store.vendorId !== req.userId && req.userRole !== "admin") {
        return res.status(403).json({ message: "Not authorized to add products to this store" });
      }

      const validatedData = insertProductSchema.parse({ storeId, ...productData });
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
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

      const { storeId, ...sanitizedUpdates } = insertProductSchema.partial().parse(req.body);
      const updatedProduct = await storage.updateProduct(productId, sanitizedUpdates);
      res.json(updatedProduct);
    } catch (error: any) {
      console.error("Error updating product:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const productId = req.params.id;
      const existingProduct = await storage.getProduct(productId);
      
      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const store = await storage.getStore(existingProduct.storeId);
      if (!store || (store.vendorId !== req.userId && req.userRole !== "admin")) {
        return res.status(403).json({ message: "Not authorized to delete this product" });
      }

      await storage.deleteProduct(productId);
      res.status(204).send();
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
      res.json(products);
    } catch (error) {
      console.error("Error fetching vendor products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Order Management Routes
  app.post('/api/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { items, ...orderData } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Order must contain at least one item" });
      }

      const validatedOrder = insertOrderSchema.parse({
        ...orderData,
        buyerId: userId,
      });

      const order = await storage.createOrder(validatedOrder);

      const orderItemsPromises = items.map((item: any) => {
        const validatedItem = insertOrderItemSchema.parse({
          ...item,
          orderId: order.id,
        });
        return storage.createOrderItem(validatedItem);
      });

      await Promise.all(orderItemsPromises);
      res.status(201).json(order);
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
      const userId = req.user.claims.sub;
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
      res.json({ ...order, items });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.get('/api/buyer/orders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orders = await storage.getOrdersByBuyer(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching buyer orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.put('/api/orders/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status } = req.body;
      
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

      const updatedOrder = await storage.updateOrderStatus(req.params.id, status);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Vendor Dashboard Routes
  app.get('/api/vendor/orders', isAuthenticated, isVendor, async (req: any, res) => {
    try {
      const stores = await storage.getStoresByVendor(req.userId);
      const allOrders = await Promise.all(
        stores.map(store => storage.getOrdersByStore(store.id))
      );
      const uniqueOrders = Array.from(
        new Map(allOrders.flat().map(order => [order.id, order])).values()
      );
      res.json(uniqueOrders);
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
        totalRevenue,
        totalEarnings,
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
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const updatedStore = await storage.updateStoreStatus(req.params.id, status);
      if (!updatedStore) {
        return res.status(404).json({ message: "Store not found" });
      }
      res.json(updatedStore);
    } catch (error) {
      console.error("Error updating store status:", error);
      res.status(500).json({ message: "Failed to update store status" });
    }
  });

  app.get('/api/admin/products', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
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

  app.get('/api/admin/analytics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const [stores, productsResult, orders] = await Promise.all([
        storage.getAllStores(),
        storage.getAllProducts({}),
        storage.getAllOrders(),
      ]);

      const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
      
      res.json({
        totalStores: stores.length,
        activeStores: stores.filter(s => s.status === 'approved').length,
        pendingStores: stores.filter(s => s.status === 'pending').length,
        totalProducts: productsResult.total,
        approvedProducts: productsResult.products.filter(p => p.status === 'approved').length,
        pendingProducts: productsResult.products.filter(p => p.status === 'pending').length,
        totalOrders: orders.length,
        totalRevenue,
      });
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.put('/api/admin/users/:id/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { role } = req.body;
      if (!role || !['buyer', 'vendor', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(req.params.id, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Messaging Routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const currentUserId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const messages = await storage.getMessagesForUser(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
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

  const httpServer = createServer(app);
  return httpServer;
}
