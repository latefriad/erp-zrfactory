import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { DzshipService } from '../src/services/dzshipService';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { UserRole, OrderStatus } from '@zr-erp/shared';

describe('dzship Algerian Couriers Integration (Elogistia, ZR Express, Ecom Delivery)', () => {
  let db: Database.Database;
  let dzshipService: DzshipService;
  let authService: AuthService;
  let app: any;
  let adminToken: string;

  beforeEach(async () => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    dzshipService = new DzshipService(db);
    authService = new AuthService(db);
    app = createApp();

    const admin = await authService.login('admin@zrfactory.dz', 'admin123456');
    adminToken = admin.token;
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Courier Configurations & Credentials Management', () => {
    it('should seed default courier profiles including Elogistia, ZR Express, and Ecom Delivery', () => {
      const couriers = dzshipService.listCouriers(true);
      expect(couriers.length).toBeGreaterThanOrEqual(5);

      const keys = couriers.map(c => c.courierKey);
      expect(keys).toContain('elogistia');
      expect(keys).toContain('zrexpress');
      expect(keys).toContain('zrexpressnew');
      expect(keys).toContain('ecomdelivery');
      expect(keys).toContain('yalidine');
      expect(keys).toContain('sandbox');
    });

    it('should save and mask API keys for Elogistia', () => {
      const saved = dzshipService.saveCourier({
        courierKey: 'elogistia',
        isActive: true,
        credentials: {
          apiKey: 'elo_secret_test_key_123456789'
        },
        fromWilaya: 16,
        defaultDeliveryType: 'home'
      });

      expect(saved.courierKey).toBe('elogistia');
      expect(saved.isActive).toBe(true);
      expect(saved.credentials.apiKey).toContain('••••••••');
      expect(saved.credentials.apiKey).not.toBe('elo_secret_test_key_123456789');

      // Verify raw retrieval retrieves exact secret
      const raw = dzshipService.getRawCourier('elogistia');
      expect(raw.credentials.apiKey).toBe('elo_secret_test_key_123456789');
    });

    it('should save credentials for ZR Express and Ecom Delivery', () => {
      dzshipService.saveCourier({
        courierKey: 'zrexpress',
        isActive: true,
        credentials: {
          token: 'zr_token_abc',
          key: 'zr_key_xyz'
        }
      });

      dzshipService.saveCourier({
        courierKey: 'ecomdelivery',
        isActive: true,
        credentials: {
          apiKey: 'ecom_api_key_123',
          apiToken: 'ecom_token_456'
        }
      });

      const rawZR = dzshipService.getRawCourier('zrexpress');
      expect(rawZR.credentials.token).toBe('zr_token_abc');
      expect(rawZR.credentials.key).toBe('zr_key_xyz');

      const rawEcom = dzshipService.getRawCourier('ecomdelivery');
      expect(rawEcom.credentials.apiKey).toBe('ecom_api_key_123');
      expect(rawEcom.credentials.apiToken).toBe('ecom_token_456');
    });

    it('should correctly set default courier and unset others', () => {
      dzshipService.saveCourier({ courierKey: 'elogistia', isDefault: true });
      const couriers = dzshipService.listCouriers(false);

      const elo = couriers.find(c => c.courierKey === 'elogistia');
      expect(elo?.isDefault).toBe(true);

      const sandbox = couriers.find(c => c.courierKey === 'sandbox');
      expect(sandbox?.isDefault).toBe(false);
    });

    it('should successfully test connection on Sandbox courier', async () => {
      const result = await dzshipService.testCourier('sandbox');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Sandbox');
    });
  });

  describe('Order Dispatch via dzship', () => {
    it('should dispatch an order via sandbox courier and update tracking', async () => {
      // Find an order from seed
      const order = db.prepare("SELECT id, order_number FROM orders LIMIT 1").get() as any;
      expect(order).toBeDefined();

      const result = await dzshipService.dispatchOrder(order.id, 'sandbox');
      expect(result.orderId).toBe(order.id);
      expect(result.status).toBe('SHIPPED');
      expect(result.trackingNumber).toBeDefined();
      expect(result.trackingNumber.length).toBeGreaterThan(3);

      // Verify DB order state
      const updatedOrder = db.prepare('SELECT status, tracking_number, delivery_company, dispatched_at FROM orders WHERE id = ?').get(order.id) as any;
      expect(updatedOrder.status).toBe(OrderStatus.SHIPPED);
      expect(updatedOrder.tracking_number).toBe(result.trackingNumber);
      expect(updatedOrder.delivery_company).toContain('Sandbox');
      expect(updatedOrder.dispatched_at).toBeDefined();
    });

    it('should track parcel status from dzship', async () => {
      const trackRes = await dzshipService.trackParcel('DZTEST-18PY9I', 'sandbox');
      expect(trackRes.trackingNumber).toBe('DZTEST-18PY9I');
      expect(trackRes.status).toBeDefined();
      expect(Array.isArray(trackRes.events)).toBe(true);
    });
  });

  describe('REST API Endpoints', () => {
    it('GET /api/shipping/couriers should return courier list for authenticated user', async () => {
      const res = await request(app)
        .get('/api/shipping/couriers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.couriers).toBeInstanceOf(Array);
      expect(res.body.data.couriers.some((c: any) => c.courierKey === 'elogistia')).toBe(true);
    });

    it('POST /api/shipping/couriers should save courier settings', async () => {
      const res = await request(app)
        .post('/api/shipping/couriers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          courierKey: 'elogistia',
          isActive: true,
          credentials: {
            apiKey: 'sk_test_elogistia_key_999'
          },
          fromWilaya: 16
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.courier.courierKey).toBe('elogistia');
      expect(res.body.data.courier.isActive).toBe(true);
    });

    it('POST /api/shipping/couriers/sandbox/test should test sandbox connection', async () => {
      const res = await request(app)
        .post('/api/shipping/couriers/sandbox/test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('POST /api/shipping/dispatch-order should dispatch order to courier', async () => {
      const order = db.prepare('SELECT id FROM orders LIMIT 1').get() as any;

      const res = await request(app)
        .post('/api/shipping/dispatch-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: order.id,
          courierKey: 'sandbox'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trackingNumber).toBeDefined();
      expect(res.body.data.status).toBe('SHIPPED');
    });

    it('POST /api/shipping/track-order should return tracking info', async () => {
      const res = await request(app)
        .post('/api/shipping/track-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          trackingNumber: 'DZTEST-12345',
          courierKey: 'sandbox'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trackingNumber).toBe('DZTEST-12345');
    });
  });
});
