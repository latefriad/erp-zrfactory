import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { OrderService } from '../src/services/orderService';
import { CustomerService } from '../src/services/customerService';
import { ProductService } from '../src/services/productService';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { OrderStatus, PaymentStatus } from '@zr-erp/shared';

describe('Phase 4: Customers, CRM & Orders Lifecycle', () => {
  let db: Database.Database;
  let orderService: OrderService;
  let customerService: CustomerService;
  let productService: ProductService;
  let authService: AuthService;
  let app: any;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    orderService = new OrderService(db);
    customerService = new CustomerService(db);
    productService = new ProductService(db);
    authService = new AuthService(db);
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Customer Service & CRM Profile', () => {
    it('should create a new customer with valid Algerian details', () => {
      const customer = customerService.createCustomer({
        name: 'Djamel Belmadi',
        phone: '0555112233',
        email: 'djamel@algeria.dz',
        address: 'Rue Didouche Mourad',
        wilaya: 'Alger',
        commune: 'Alger Centre',
        notes: 'Client VIP',
      });

      expect(customer.id).toBeDefined();
      expect(customer.name).toBe('Djamel Belmadi');
      expect(customer.phone).toBe('0555112233');
      expect(customer.wilaya).toBe('Alger');
    });

    it('should prevent duplicate customer phone numbers', () => {
      expect(() => {
        customerService.createCustomer({
          name: 'Double Karim',
          phone: '0550123456', // Seeded phone for Karim Bouzid
          wilaya: 'Alger',
          commune: 'Alger Centre',
        });
      }).toThrow(/existe déjà/);
    });

    it('should calculate customer lifetime value (CLV) and order stats', () => {
      const profile = customerService.getCustomerProfile('cust-karim-alger');

      expect(profile.name).toBe('Karim Bouzid');
      expect(profile.totalOrders).toBeGreaterThanOrEqual(1);
      expect(profile.deliveredOrders).toBeGreaterThanOrEqual(1);
      expect(profile.totalSpent).toBe(5500); // 1 delivered order of 5,500 DA
      expect(profile.customerLifetimeValue).toBe(5500);
      expect(profile.recentOrders.length).toBeGreaterThanOrEqual(1);
    });

    it('should search customers by name, phone or wilaya', () => {
      const searchByName = customerService.listCustomers({ search: 'Amine' });
      expect(searchByName.length).toBe(1);
      expect(searchByName[0].name).toBe('Amine Benali');

      const searchByWilaya = customerService.listCustomers({ wilaya: 'Oran' });
      expect(searchByWilaya.length).toBe(1);
      expect(searchByWilaya[0].wilaya).toBe('Oran');
    });
  });

  describe('Print-on-Demand Order Financial Calculations', () => {
    it('should automatically derive POD unit cost and calculate subtotal, cost, profit and grand total', () => {
      // Product 'prod-tshirt-oversized' has:
      // Cost components: T-Shirt (700) + DTF (400) + Packaging (50) = 1,150 DA
      // Selling price: 2,500 DA
      const order = orderService.createOrder({
        customerId: 'cust-karim-alger',
        items: [
          {
            productId: 'prod-tshirt-oversized',
            variantId: 'var-2', // Noir / M
            quantity: 3,
            notes: 'Finition soignée',
          },
        ],
        deliveryFee: 600,
        discount: 200,
        notes: 'Commande test calculs',
      });

      expect(order.orderNumber).toMatch(/^ZR-\d{6}-\d{4}/);
      expect(order.items?.length).toBe(1);

      const item = order.items![0];
      expect(item.quantity).toBe(3);
      expect(item.unitCost).toBe(1150);
      expect(item.sellingPrice).toBe(2500);
      expect(item.totalCost).toBe(3450); // 3 * 1,150
      expect(item.totalPrice).toBe(7500); // 3 * 2,500

      // Order totals:
      // Subtotal = 7,500 DA
      // Discount = 200 DA
      // Delivery fee = 600 DA
      // Total = 7,500 - 200 + 600 = 7,900 DA
      // Profit = (7,500 - 200) - 3,450 = 3,850 DA
      expect(order.subtotal).toBe(7500);
      expect(order.discount).toBe(200);
      expect(order.deliveryFee).toBe(600);
      expect(order.total).toBe(7900);
      expect(order.cost).toBe(3450);
      expect(order.profit).toBe(3850);
    });

    it('should handle multi-item orders with different products correctly', () => {
      // Item 1: 2 x T-shirt (2 * 2500 = 5000; cost: 2 * 1150 = 2300)
      // Item 2: 1 x Cap (1 * 1600 = 1600; cost: 1 * 730 = 730)
      const order = orderService.createOrder({
        customerId: 'cust-amine-oran',
        items: [
          { productId: 'prod-tshirt-oversized', variantId: 'var-2', quantity: 2 },
          { productId: 'prod-casquette-custom', variantId: 'var-7', quantity: 1 },
        ],
        deliveryFee: 800,
      });

      expect(order.subtotal).toBe(6600); // 5000 + 1600
      expect(order.cost).toBe(3030); // 2300 + 730
      expect(order.profit).toBe(3570); // 6600 - 3030
      expect(order.total).toBe(7400); // 6600 + 800
    });
  });

  describe('Inventory Stock Deduction & Restoration on Order Cancellation', () => {
    it('should deduct variant stock when order is placed and restore it when cancelled', () => {
      // Initial stock of var-3 (Noir / L) is 40
      const initialVariant = productService.getProductById('prod-tshirt-oversized').variants.find(v => v.id === 'var-3');
      expect(initialVariant?.stockQuantity).toBe(40);

      // Create order for 5 units
      const order = orderService.createOrder({
        customerId: 'cust-karim-alger',
        items: [
          { productId: 'prod-tshirt-oversized', variantId: 'var-3', quantity: 5 },
        ],
      });

      // Stock should now be 35
      const variantAfterOrder = productService.getProductById('prod-tshirt-oversized').variants.find(v => v.id === 'var-3');
      expect(variantAfterOrder?.stockQuantity).toBe(35);

      // Cancel the order
      orderService.updateOrderStatus(order.id, OrderStatus.CANCELLED);

      // Stock must be restored back to 40!
      const variantAfterCancel = productService.getProductById('prod-tshirt-oversized').variants.find(v => v.id === 'var-3');
      expect(variantAfterCancel?.stockQuantity).toBe(40);
    });

    it('should restore stock when order is returned', () => {
      const initialVariant = productService.getProductById('prod-tshirt-oversized').variants.find(v => v.id === 'var-4');
      const startStock = initialVariant?.stockQuantity || 15;

      const order = orderService.createOrder({
        customerId: 'cust-karim-alger',
        items: [
          { productId: 'prod-tshirt-oversized', variantId: 'var-4', quantity: 2 },
        ],
      });

      expect(productService.getProductById('prod-tshirt-oversized').variants.find(v => v.id === 'var-4')?.stockQuantity).toBe(startStock - 2);

      // Advance to RETURNED
      orderService.updateOrderStatus(order.id, OrderStatus.RETURNED);

      expect(productService.getProductById('prod-tshirt-oversized').variants.find(v => v.id === 'var-4')?.stockQuantity).toBe(startStock);
    });
  });

  describe('Order Lifecycle Transitions & KPIs', () => {
    it('should advance order status through the full production pipeline', () => {
      const order = orderService.createOrder({
        customerId: 'cust-karim-alger',
        items: [{ productId: 'prod-tshirt-oversized', variantId: 'var-2', quantity: 1 }],
      });

      expect(order.status).toBe(OrderStatus.PENDING);

      const confirmed = orderService.updateOrderStatus(order.id, OrderStatus.CONFIRMED);
      expect(confirmed.status).toBe(OrderStatus.CONFIRMED);

      const printing = orderService.updateOrderStatus(order.id, OrderStatus.PRINTING);
      expect(printing.status).toBe(OrderStatus.PRINTING);

      const ready = orderService.updateOrderStatus(order.id, OrderStatus.READY);
      expect(ready.status).toBe(OrderStatus.READY);

      const shipped = orderService.updateOrderStatus(order.id, OrderStatus.SHIPPED);
      expect(shipped.status).toBe(OrderStatus.SHIPPED);

      const delivered = orderService.updateOrderStatus(order.id, OrderStatus.DELIVERED);
      expect(delivered.status).toBe(OrderStatus.DELIVERED);
    });

    it('should aggregate order stats accurately', () => {
      const stats = orderService.getOrderStats();

      expect(stats.totalOrders).toBeGreaterThanOrEqual(4);
      expect(stats.totalRevenue).toBeGreaterThan(0);
      expect(stats.totalGrossProfit).toBeGreaterThan(0);
      expect(stats.averageOrderValue).toBeGreaterThan(0);
    });
  });

  describe('HTTP API & RBAC Endpoints', () => {
    it('should allow Employee to list and create orders', async () => {
      const loginRes = await authService.login('employee@zrfactory.dz', 'employee123456');
      const token = loginRes.token;

      // GET orders
      const listRes = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.orders.length).toBeGreaterThanOrEqual(1);

      // POST new order
      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: 'cust-karim-alger',
          items: [{ productId: 'prod-tshirt-oversized', variantId: 'var-2', quantity: 1 }],
          deliveryFee: 500,
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.order.subtotal).toBe(2500);
      expect(createRes.body.data.order.total).toBe(3000);
    });

    it('should allow Employee to advance order status', async () => {
      const loginRes = await authService.login('employee@zrfactory.dz', 'employee123456');
      const token = loginRes.token;

      const patchRes = await request(app)
        .patch('/api/orders/ord-seed-004/status')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: OrderStatus.CONFIRMED });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.order.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should block Viewer from creating orders (403 Forbidden)', async () => {
      const loginRes = await authService.login('viewer@zrfactory.dz', 'viewer123456');
      const token = loginRes.token;

      const createRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: 'cust-karim-alger',
          items: [{ productId: 'prod-tshirt-oversized', quantity: 1 }],
        });

      expect(createRes.status).toBe(403);
    });

    it('should fetch order stats pipeline via API', async () => {
      const loginRes = await authService.login('admin@zrfactory.dz', 'admin123456');
      const token = loginRes.token;

      const statsRes = await request(app)
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.data.stats.totalOrders).toBeGreaterThanOrEqual(4);
    });
  });
});
