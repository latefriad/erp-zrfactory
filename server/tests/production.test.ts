import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { ProductionService } from '../src/services/productionService';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { ProductionStatus, OrderStatus } from '@zr-erp/shared';

describe('Phase 10: Print-on-Demand Production Floor & Atelier Kanban', () => {
  let db: Database.Database;
  let productionService: ProductionService;
  let authService: AuthService;
  let app: any;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    productionService = new ProductionService(db);
    authService = new AuthService(db);
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Production Service Core Logic', () => {
    it('should list seeded production items in the queue with enriched metadata', () => {
      const items = productionService.listQueue();
      expect(items.length).toBeGreaterThanOrEqual(4);

      const item = items[0];
      expect(item.id).toBeDefined();
      expect(item.orderId).toBeDefined();
      expect(item.orderNumber).toBeDefined();
      expect(item.productName).toBeDefined();
      expect(item.status).toBeDefined();
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.dtfFormat).toBeDefined();
    });

    it('should filter queue by production status', () => {
      const pendingItems = productionService.listQueue({ status: ProductionStatus.PENDING_DESIGN });
      expect(pendingItems.length).toBeGreaterThan(0);
      for (const item of pendingItems) {
        expect(item.status).toBe(ProductionStatus.PENDING_DESIGN);
      }

      const printItems = productionService.listQueue({ status: ProductionStatus.PRINTING_DTF });
      expect(printItems.length).toBeGreaterThan(0);
      for (const item of printItems) {
        expect(item.status).toBe(ProductionStatus.PRINTING_DTF);
      }
    });

    it('should filter queue by search term matching order or customer', () => {
      const searchItems = productionService.listQueue({ search: 'ZR-202609-0003' });
      expect(searchItems.length).toBeGreaterThan(0);
      for (const item of searchItems) {
        expect(item.orderNumber).toBe('ZR-202609-0003');
      }
    });

    it('should advance item status through production lifecycle', () => {
      const initial = productionService.getItemById('pi-seed-01');
      expect(initial.status).toBe(ProductionStatus.PENDING_DESIGN);

      // Advance to READY_FOR_PRINT
      const ready = productionService.updateStatus(
        'pi-seed-01',
        ProductionStatus.READY_FOR_PRINT,
        'usr-employee',
        'Employé Production',
        'Maquette A3 approuvée par le client'
      );
      expect(ready.status).toBe(ProductionStatus.READY_FOR_PRINT);
      expect(ready.operatorNotes).toBe('Maquette A3 approuvée par le client');

      // Advance to PRINTING_DTF -> sets started_at
      const printing = productionService.updateStatus(
        'pi-seed-01',
        ProductionStatus.PRINTING_DTF,
        'usr-employee',
        'Employé Production'
      );
      expect(printing.status).toBe(ProductionStatus.PRINTING_DTF);
      expect(printing.startedAt).toBeDefined();

      // Advance to HEAT_PRESS
      const pressing = productionService.updateStatus(
        'pi-seed-01',
        ProductionStatus.HEAT_PRESS,
        'usr-employee',
        'Employé Production'
      );
      expect(pressing.status).toBe(ProductionStatus.HEAT_PRESS);

      // Advance to QUALITY_CHECK
      const qc = productionService.updateStatus(
        'pi-seed-01',
        ProductionStatus.QUALITY_CHECK,
        'usr-admin',
        'Administrateur ZR'
      );
      expect(qc.status).toBe(ProductionStatus.QUALITY_CHECK);

      // Advance to PACKED -> sets completed_at
      const packed = productionService.updateStatus(
        'pi-seed-01',
        ProductionStatus.PACKED,
        'usr-employee',
        'Employé Production'
      );
      expect(packed.status).toBe(ProductionStatus.PACKED);
      expect(packed.completedAt).toBeDefined();
    });

    it('should reject invalid production status with ValidationError', () => {
      expect(() => {
        productionService.updateStatus('pi-seed-01', 'INVALID_STATUS' as any);
      }).toThrow();
    });

    it('should log a quality defect and reset status for re-print if requested', () => {
      const before = productionService.getItemById('pi-seed-03');
      const initialDefects = before.defectCount;

      const defectLogged = productionService.logDefect(
        'pi-seed-03',
        'Défaut d\'encre blanche sur bordure logo - re-print nécessaire',
        true,
        'usr-employee',
        'Employé Production'
      );

      expect(defectLogged.defectCount).toBe(initialDefects + 1);
      expect(defectLogged.defectReason).toContain('Défaut d\'encre blanche');
      // Because requiresReprint was true, status reset to READY_FOR_PRINT
      expect(defectLogged.status).toBe(ProductionStatus.READY_FOR_PRINT);
    });

    it('should return aggregated production metrics', () => {
      const metrics = productionService.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.totalActive).toBeGreaterThan(0);
      expect(metrics.inPrint).toBeGreaterThanOrEqual(1);
      expect(metrics.inPress).toBeGreaterThanOrEqual(1);
      expect(metrics.inQualityCheck).toBeGreaterThanOrEqual(1);
      expect(typeof metrics.defectRate).toBe('number');
      expect(typeof metrics.totalDefects).toBe('number');
    });

    it('should automatically sync parent order status when all items are packed', () => {
      // Order ord-seed-004 has single item pi-seed-01
      const orderBefore = db.prepare('SELECT status FROM orders WHERE id = ?').get('ord-seed-004') as any;
      expect(orderBefore.status).toBe(OrderStatus.PENDING);

      // Pack the item
      productionService.updateStatus(
        'pi-seed-01',
        ProductionStatus.PACKED,
        'usr-employee',
        'Opérateur'
      );

      // Check order status was updated
      const orderAfter = db.prepare('SELECT status FROM orders WHERE id = ?').get('ord-seed-004') as any;
      expect(orderAfter.status).toBe(OrderStatus.SHIPPED);
    });
  });

  describe('HTTP API Endpoints & RBAC Security', () => {
    let adminToken: string;
    let partnerToken: string;
    let employeeToken: string;
    let viewerToken: string;

    beforeEach(async () => {
      adminToken = (await authService.login('admin@zrfactory.dz', 'admin123456')).token;
      partnerToken = (await authService.login('riad@zrfactory.dz', 'riad123456')).token;
      employeeToken = (await authService.login('employee@zrfactory.dz', 'employee123456')).token;
      viewerToken = (await authService.login('viewer@zrfactory.dz', 'viewer123456')).token;
    });

    it('should allow Employee, Partner, and Admin to fetch queue and metrics', async () => {
      const resEmployee = await request(app)
        .get('/api/production')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(resEmployee.status).toBe(200);
      expect(resEmployee.body.success).toBe(true);
      expect(Array.isArray(resEmployee.body.data.items)).toBe(true);

      const resMetrics = await request(app)
        .get('/api/production/metrics')
        .set('Authorization', `Bearer ${partnerToken}`);
      expect(resMetrics.status).toBe(200);
      expect(resMetrics.body.data.metrics).toBeDefined();

      const resItem = await request(app)
        .get('/api/production/pi-seed-01')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resItem.status).toBe(200);
      expect(resItem.body.data.item.id).toBe('pi-seed-01');
    });

    it('should allow Employee to update production status via PATCH /api/production/:id/status', async () => {
      const res = await request(app)
        .patch('/api/production/pi-seed-02/status')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          status: ProductionStatus.PRINTING_DTF,
          notes: 'Lancement sur traceur 60cm',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item.status).toBe(ProductionStatus.PRINTING_DTF);
    });

    it('should allow Employee to report defect via POST /api/production/:id/defect', async () => {
      const res = await request(app)
        .post('/api/production/pi-seed-02/defect')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          defectReason: 'Buse bouchée sur le cyan',
          requiresReprint: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item.defectCount).toBeGreaterThan(0);
      expect(res.body.data.item.status).toBe(ProductionStatus.READY_FOR_PRINT);
    });

    it('should block Viewer from mutating production status (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/production/pi-seed-01/status')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          status: ProductionStatus.HEAT_PRESS,
        });

      expect(res.status).toBe(403);
    });

    it('should block Viewer from reporting defect (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/production/pi-seed-01/defect')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          defectReason: 'Test',
        });

      expect(res.status).toBe(403);
    });
  });
});
