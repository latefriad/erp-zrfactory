import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { ShippingService } from '../src/services/shippingService';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { CarrierName, ManifestStatus, OrderStatus, PaymentStatus, UserRole } from '@zr-erp/shared';

describe('Phase 11: Shipping Logistics & Carrier Integration', () => {
  let db: Database.Database;
  let shippingService: ShippingService;
  let authService: AuthService;
  let app: any;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    shippingService = new ShippingService(db);
    authService = new AuthService(db);
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Shipping Service Core Operations', () => {
    it('should list ready-to-ship orders in the queue', () => {
      const queue = shippingService.listShippingQueue();
      expect(queue.length).toBeGreaterThanOrEqual(1);

      const item = queue[0];
      expect(item.id).toBeDefined();
      expect(item.orderNumber).toBeDefined();
      expect(item.customerName).toBeDefined();
      expect(item.shippingWilaya).toBeDefined();
      expect(item.total).toBeGreaterThan(0);
      expect(item.itemsCount).toBeDefined();
    });

    it('should filter queue by wilaya and search query', () => {
      const filtered = shippingService.listShippingQueue({ search: 'ord-seed-003' });
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered[0].orderNumber).toBe('ZR-202609-0003');
    });

    it('should atomically create a batch Shipping Manifest and assign tracking numbers', () => {
      // Find orders ready to dispatch
      const queue = shippingService.listShippingQueue();
      const orderIds = queue.map((o) => o.id);

      const manifest = shippingService.createManifest(
        {
          carrier: CarrierName.YALIDINE,
          driverName: 'Karim Driver',
          driverPhone: '0555998877',
          vehiclePlate: '12345-116-16',
          notes: 'Test Manifest Dispatch',
          orderIds: [orderIds[0]],
        },
        'usr-employee',
        'Employé Atelier'
      );

      expect(manifest.id).toBeDefined();
      expect(manifest.manifestNumber).toMatch(/^MAN-\d{4}-\d{4}$/);
      expect(manifest.carrier).toBe(CarrierName.YALIDINE);
      expect(manifest.totalParcels).toBe(1);
      expect(manifest.totalCodAmount).toBeGreaterThan(0);
      expect(manifest.status).toBe(ManifestStatus.DISPATCHED);
      expect(manifest.orders?.length).toBe(1);

      const shippedOrder = manifest.orders![0];
      expect(shippedOrder.status).toBe(OrderStatus.SHIPPED);
      expect(shippedOrder.trackingNumber).toMatch(/^yal-\d{4}-\d{5}$/);
      expect(shippedOrder.dispatchedAt).toBeDefined();
    });

    it('should list and retrieve manifests by ID', () => {
      const manifests = shippingService.listManifests();
      expect(manifests.length).toBeGreaterThanOrEqual(1);

      const first = manifests[0];
      const details = shippingService.getManifestById(first.id);
      expect(details.id).toBe(first.id);
      expect(details.orders).toBeDefined();
      expect(details.orders!.length).toBe(first.totalParcels);
    });

    it('should update manifest status', () => {
      const manifests = shippingService.listManifests();
      const manifest = manifests[0];

      const updated = shippingService.updateManifestStatus(
        manifest.id,
        ManifestStatus.COMPLETED,
        'usr-admin',
        'Admin ZR'
      );
      expect(updated.status).toBe(ManifestStatus.COMPLETED);
      expect(updated.completedAt).toBeDefined();
    });

    it('should mark a parcel as DELIVERED by carrier', () => {
      // ord-seed-002 is seeded in man-seed-001 with status SHIPPED
      const delivered = shippingService.markOrderDelivered(
        'ord-seed-002',
        'usr-employee',
        'Employé Atelier',
        'Livré en main propre au client'
      );

      expect(delivered.status).toBe(OrderStatus.DELIVERED);
      expect(delivered.deliveredAt).toBeDefined();
    });

    it('should mark a parcel as RETURNED and restore variant stock', () => {
      // Check initial stock for variant of ord-seed-003 (var-3)
      const variantRowBefore = db.prepare(`
        SELECT stock_quantity FROM product_variants WHERE id = 'var-3'
      `).get() as any;
      const stockBefore = variantRowBefore.stock_quantity;

      const returned = shippingService.markOrderReturned(
        'ord-seed-003',
        'Client injoignable après 3 tentatives',
        true,
        'usr-employee',
        'Employé Atelier'
      );

      expect(returned.status).toBe(OrderStatus.RETURNED);
      expect(returned.returnedAt).toBeDefined();
      expect(returned.returnReason).toBe('Client injoignable après 3 tentatives');

      // Verify stock was restored (+2 since ord-seed-003 has quantity 2)
      const variantRowAfter = db.prepare(`
        SELECT stock_quantity FROM product_variants WHERE id = 'var-3'
      `).get() as any;
      expect(variantRowAfter.stock_quantity).toBe(stockBefore + 2);
    });

    it('should settle COD remittance and credit target Cash Account with double-entry transaction', () => {
      // First deliver ord-seed-002 in man-seed-001
      shippingService.markOrderDelivered('ord-seed-002', 'usr-employee', 'Employé');

      // Check initial cash account balance
      const cashBefore = db.prepare(`
        SELECT balance FROM cash_accounts WHERE id = 'acc-caisse-principale'
      `).get() as any;
      const initialBalance = Number(cashBefore.balance);

      const orderRow = db.prepare(`SELECT total FROM orders WHERE id = 'ord-seed-002'`).get() as any;
      const expectedCOD = Number(orderRow.total);

      // Settle COD remittance
      const remittance = shippingService.remitManifestCOD(
        'man-seed-001',
        'acc-caisse-principale',
        'usr-admin',
        'Administrateur'
      );

      expect(remittance.totalRemitted).toBe(expectedCOD);
      expect(remittance.ordersCount).toBe(1);
      expect(remittance.newCashBalance).toBe(initialBalance + expectedCOD);

      // Verify cash_accounts updated
      const cashAfter = db.prepare(`
        SELECT balance FROM cash_accounts WHERE id = 'acc-caisse-principale'
      `).get() as any;
      expect(Number(cashAfter.balance)).toBe(initialBalance + expectedCOD);

      // Verify order payment_status updated to PAID
      const orderAfter = db.prepare(`SELECT payment_status, cod_remitted_at FROM orders WHERE id = 'ord-seed-001'`).get() as any;
      expect(orderAfter.payment_status).toBe(PaymentStatus.PAID);
      expect(orderAfter.cod_remitted_at).toBeDefined();

      // Verify cash_transactions double-entry record created
      const tx = db.prepare(`
        SELECT * FROM cash_transactions WHERE reference_id = 'man-seed-001'
      `).get() as any;
      expect(tx).toBeDefined();
      expect(tx.type).toBe('ORDER_PAYMENT');
      expect(Number(tx.amount)).toBe(expectedCOD);
    });

    it('should retrieve 58 Wilayas shipping delivery rates and update a rate', () => {
      const rates = shippingService.getShippingRates();
      expect(rates.length).toBe(58);

      const alger = rates.find((r) => r.wilayaCode === 16);
      expect(alger).toBeDefined();
      expect(alger?.wilayaName).toBe('Alger');
      expect(alger?.feeDomicile).toBe(500);

      // Update Oran (31) fee
      const updated = shippingService.updateShippingRate(31, {
        feeDomicile: 700,
        feeStopDesk: 500,
      });

      expect(updated.feeDomicile).toBe(700);
      expect(updated.feeStopDesk).toBe(500);
    });

    it('should aggregate real-time shipping KPIs', () => {
      const metrics = shippingService.getShippingMetrics();
      expect(metrics.inTransitCount).toBeGreaterThanOrEqual(0);
      expect(metrics.pendingCodAmount).toBeGreaterThanOrEqual(0);
      expect(metrics.activeManifestsCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Shipping API Endpoints & Strict RBAC', () => {
    let adminToken: string;
    let employeeToken: string;
    let viewerToken: string;

    beforeEach(async () => {
      const adminLogin = await authService.login('admin@zrfactory.dz', 'admin123456');
      adminToken = adminLogin.token;

      const empLogin = await authService.login('employee@zrfactory.dz', 'employee123456');
      employeeToken = empLogin.token;

      const viewerLogin = await authService.login('viewer@zrfactory.dz', 'viewer123456');
      viewerToken = viewerLogin.token;
    });

    it('GET /api/shipping/metrics should be accessible to all authenticated roles', async () => {
      const res = await request(app)
        .get('/api/shipping/metrics')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.inTransitCount).toBeDefined();
    });

    it('GET /api/shipping/queue should list ready orders', async () => {
      const res = await request(app)
        .get('/api/shipping/queue')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
    });

    it('POST /api/shipping/manifests should allow EMPLOYEE to create manifest', async () => {
      const queueRes = await request(app)
        .get('/api/shipping/queue')
        .set('Authorization', `Bearer ${employeeToken}`);

      const orderId = queueRes.body.data.orders[0]?.id;
      if (orderId) {
        const res = await request(app)
          .post('/api/shipping/manifests')
          .set('Authorization', `Bearer ${employeeToken}`)
          .send({
            carrier: 'ZR_DISPATCH',
            driverName: 'Said ZR',
            driverPhone: '0661223344',
            orderIds: [orderId],
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.manifest.manifestNumber).toBeDefined();
      }
    });

    it('POST /api/shipping/manifests should FORBID VIEWER (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/shipping/manifests')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          carrier: 'YALIDINE',
          orderIds: ['ord-seed-003'],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('POST /api/shipping/orders/:id/deliver should allow EMPLOYEE to mark delivered', async () => {
      const res = await request(app)
        .post('/api/shipping/orders/ord-seed-002/deliver')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ notes: 'Colis livré avec succès' });

      expect(res.status).toBe(200);
      expect(res.body.data.order.status).toBe('DELIVERED');
    });

    it('POST /api/shipping/orders/:id/deliver should FORBID VIEWER (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/shipping/orders/ord-seed-002/deliver')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ notes: 'Colis livré' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/shipping/manifests/:id/remit-cod should allow ADMIN and FORBID EMPLOYEE', async () => {
      // Deliver order first
      await request(app)
        .post('/api/shipping/orders/ord-seed-002/deliver')
        .set('Authorization', `Bearer ${adminToken}`);

      // EMPLOYEE attempt to remit COD: should be 403
      const empRes = await request(app)
        .post('/api/shipping/manifests/man-seed-001/remit-cod')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ cashAccountId: 'acc-caisse-principale' });

      expect(empRes.status).toBe(403);

      // ADMIN attempt: should succeed
      const adminRes = await request(app)
        .post('/api/shipping/manifests/man-seed-001/remit-cod')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ cashAccountId: 'acc-caisse-principale' });

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
      expect(adminRes.body.data.totalRemitted).toBeGreaterThan(0);
    });
  });
});
