import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { OrderService } from '../src/services/orderService';
import { ProductService } from '../src/services/productService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { OrderStatus, PaymentStatus } from '@zr-erp/shared';

describe('Phase 16: ZR Factory E-Commerce Store & Unified Backend', () => {
  let db: Database.Database;
  let orderService: OrderService;
  let productService: ProductService;
  let app: any;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    orderService = new OrderService(db);
    productService = new ProductService(db);
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  it('should allow public catalog viewing via GET /api/products without JWT auth', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.products)).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThan(0);
  });

  it('should successfully place a store guest order and auto-create customer in CRM', async () => {
    const products = productService.listProducts({ isActive: true });
    expect(products.length).toBeGreaterThan(0);
    const targetProduct = products[0];

    const payload = {
      customerName: 'Yacine Brahimi',
      customerPhone: '0555998877',
      customerEmail: 'yacine@zrfactory.dz',
      shippingWilaya: '16 - Alger (الجزائر)',
      shippingCommune: 'Bab Ezzouar',
      shippingAddress: 'Cite 1200 logts',
      deliveryOption: 'HOME',
      deliveryCompany: 'Yalidine Express',
      deliveryFee: 500,
      notes: 'Livraison apres 14h',
      items: [
        {
          productId: targetProduct.id,
          variantId: targetProduct.variants?.[0]?.id || null,
          quantity: 2,
          notes: 'Impression DTF logo poitrine',
        },
      ],
    };

    const res = await request(app)
      .post('/api/orders/store-order')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const order = res.body.data.order;
    expect(order.orderNumber).toMatch(/^ZR-\d{6}-\d{4}/);
    expect(order.customerName).toBe('Yacine Brahimi');
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.paymentStatus).toBe(PaymentStatus.UNPAID);
    expect(order.deliveryFee).toBe(500);

    // Verify it immediately appears in ERP orders list
    const erpOrders = orderService.listOrders();
    const foundInErp = erpOrders.find(o => o.orderNumber === order.orderNumber);
    expect(foundInErp).toBeDefined();
    expect(foundInErp?.customerName).toBe('Yacine Brahimi');

    // Verify public tracking by orderNumber
    const trackByNumber = await request(app).get(`/api/orders/track/${order.orderNumber}`);
    expect(trackByNumber.status).toBe(200);
    expect(trackByNumber.body.success).toBe(true);
    expect(trackByNumber.body.data.tracking.orderNumber).toBe(order.orderNumber);
    expect(trackByNumber.body.data.tracking.status).toBe(OrderStatus.PENDING);

    // Verify public tracking by phone number
    const trackByPhone = await request(app).get('/api/orders/track/0555998877');
    expect(trackByPhone.status).toBe(200);
    expect(trackByPhone.body.success).toBe(true);
    expect(trackByPhone.body.data.tracking.orderNumber).toBe(order.orderNumber);
  });
});
