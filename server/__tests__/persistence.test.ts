import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { storage } from '../storage';
import { db, pool } from '../db';
import bcrypt from 'bcrypt';
import { users, stores, products, orders, orderItems, vendorSuborders } from '@shared/schema';
import { eq } from 'drizzle-orm';

function randomEmail() {
  return `test_${Date.now()}_${Math.floor(Math.random() * 1e6)}@example.com`;
}

describe('Persistence', () => {
  let userId: string | undefined;
  let storeId: string | undefined;
  let productId: string | undefined;
  let orderId: string | undefined;
  let orderItemId: string | undefined;

  beforeAll(async () => {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    const email = randomEmail();
    const passwordHash = await bcrypt.hash('pw123456', 10);
    const user = await storage.createUser({
      email,
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
    });
    userId = user.id;
    const store = await storage.createStore({
      vendorId: userId!,
      name: 'Test Store',
      description: 'Store Desc',
      logoUrl: null as any,
      district: 'Lahore',
      giBrands: ['Brand A'],
      status: 'approved' as any,
    } as any);
    storeId = store.id;
    const product = await storage.createProduct({
      storeId: storeId!,
      title: 'Test Product',
      description: 'Product Desc',
      price: '1000.00' as any,
      stock: 10,
      images: ['/uploads/example.png'],
      district: 'Lahore',
      giBrand: 'Brand A',
      variants: null as any,
      category: 'general' as any,
      weightKg: null as any,
      lengthCm: null as any,
      widthCm: null as any,
      heightCm: null as any,
      taxExempt: false,
      status: 'approved',
      isActive: true,
    } as any);
    productId = product.id;
    const order = await storage.createOrder({
      buyerId: userId!,
      total: '1000.00' as any,
      status: 'pending',
      paymentMethod: 'cod' as any,
      shippingAddress: '123 Street, Lahore',
      recipientName: 'Test User' as any,
      recipientEmail: email as any,
      shippingStreet: '123 Street' as any,
      shippingApartment: null as any,
      shippingCity: 'Lahore' as any,
      shippingPhone: '03001234567' as any,
      shippingProvince: 'Punjab' as any,
      shippingPostalCode: '54000' as any,
      shippingCountry: 'Pakistan' as any,
      shippingMethod: 'standard' as any,
      shippingCost: '0.00' as any,
      specialInstructions: null as any,
      billingSameAsShipping: true as any,
      billingStreet: null as any,
      billingApartment: null as any,
      billingCity: null as any,
      billingProvince: null as any,
      billingPostalCode: null as any,
      billingCountry: null as any,
      taxAmount: '0.00' as any,
      taxDetails: null as any,
      preferredCommunication: 'in_app' as any,
      codReceiptId: 'TEST-REF' as any,
    } as any);
    orderId = order.id;
    const oi = await storage.createOrderItem({
      orderId: orderId!,
      productId: productId!,
      storeId: storeId!,
      quantity: 1,
      price: '1000.00' as any,
      variantSku: null as any,
      variantAttributes: null as any,
    } as any);
    orderItemId = oi.id;
  });

  afterAll(async () => {
    if (orderItemId) {
      await db.delete(orderItems).where(eq(orderItems.id, orderItemId));
    }
    if (orderId) {
      await db.delete(orders).where(eq(orders.id, orderId));
    }
    if (productId) {
      await db.delete(products).where(eq(products.id, productId));
    }
    if (storeId) {
      await db.delete(stores).where(eq(stores.id, storeId));
    }
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it('persists user', async () => {
    const [user] = await db.select().from(users).where(eq(users.id, userId!));
    expect(!!user).toBe(true);
  });

  it('persists store', async () => {
    const [store] = await db.select().from(stores).where(eq(stores.id, storeId!));
    expect(!!store).toBe(true);
  });

  it('persists product', async () => {
    const [prod] = await db.select().from(products).where(eq(products.id, productId!));
    expect(!!prod).toBe(true);
  });

  it('persists order and item', async () => {
    const [ord] = await db.select().from(orders).where(eq(orders.id, orderId!));
    const [oi] = await db.select().from(orderItems).where(eq(orderItems.id, orderItemId!));
    expect(!!ord).toBe(true);
    expect(!!oi).toBe(true);
  });

  it('persists vendor suborder', async () => {
    const sub = await storage.createVendorSuborder({
      orderId: orderId!,
      storeId: storeId!,
      vendorRef: userId! as any,
      subtotal: '1000.00' as any,
      taxAmount: '0.00' as any,
      shippingCost: '0.00' as any,
      total: '1000.00' as any,
      status: 'pending',
    } as any);
    const [row] = await db.select().from(vendorSuborders).where(eq(vendorSuborders.id, sub.id));
    expect(!!row).toBe(true);
    await db.delete(vendorSuborders).where(eq(vendorSuborders.id, sub.id));
  });
});
