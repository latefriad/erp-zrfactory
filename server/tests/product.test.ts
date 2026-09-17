import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { ProductService } from '../src/services/productService';
import { MaterialService } from '../src/services/materialService';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { CostComponentType } from '@zr-erp/shared';

describe('Phase 3: Products, Variants, Materials, Stock & POD Costing', () => {
  let db: Database.Database;
  let productService: ProductService;
  let materialService: MaterialService;
  let authService: AuthService;
  let app: any;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    productService = new ProductService(db);
    materialService = new MaterialService(db);
    authService = new AuthService(db);
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Print-on-Demand Costing Engine', () => {
    it('should accurately calculate total cost and gross profit for seeded T-Shirt', () => {
      const product = productService.getProductById('prod-tshirt-oversized');

      // T-shirt: 700 DA + DTF: 400 DA + Packaging: 50 DA = 1,150 DA
      expect(product.totalCost).toBe(1150);
      expect(product.sellingPrice).toBe(2500);

      // Gross profit = 2,500 - 1,150 = 1,350 DA
      expect(product.grossProfit).toBe(1350);
      expect(product.grossMarginPercentage).toBe(54);
    });

    it('should dynamically update total cost and gross profit when adding a cost component', () => {
      // Add a 100 DA labor cost component
      productService.addCostComponent('prod-tshirt-oversized', {
        name: 'Main d\'œuvre finition',
        type: CostComponentType.LABOR,
        cost: 100,
      });

      const updated = productService.getProductById('prod-tshirt-oversized');

      // 1150 + 100 = 1250 DA
      expect(updated.totalCost).toBe(1250);
      expect(updated.grossProfit).toBe(1250); // 2500 - 1250
      expect(updated.grossMarginPercentage).toBe(50);
    });

    it('should recalculate total cost when deleting a cost component', () => {
      const components = productService.getCostComponents('prod-tshirt-oversized');
      const packagingComp = components.find(c => c.name.includes('Packaging'));
      expect(packagingComp).toBeDefined();

      productService.deleteCostComponent(packagingComp!.id!);

      const updated = productService.getProductById('prod-tshirt-oversized');
      // 1150 - 50 = 1100 DA
      expect(updated.totalCost).toBe(1100);
      expect(updated.grossProfit).toBe(1400); // 2500 - 1100
    });
  });

  describe('Product Variants & Stock Management', () => {
    it('should add variants and prevent duplicate SKUs', () => {
      const variant = productService.addVariant('prod-tshirt-oversized', {
        name: 'Blanc / M',
        sku: 'TSHIRT-OVR-001-WHT-M',
        stockQuantity: 30,
      });

      expect(variant.sku).toBe('TSHIRT-OVR-001-WHT-M');
      expect(variant.stockQuantity).toBe(30);

      // Duplicate SKU rejection
      expect(() => {
        productService.addVariant('prod-tshirt-oversized', {
          name: 'Blanc / M Duplicate',
          sku: 'TSHIRT-OVR-001-WHT-M',
        });
      }).toThrow();
    });

    it('should update variant stock and prevent negative inventory', () => {
      const result = productService.updateVariantStock('var-1', 10); // 25 + 10 = 35
      expect(result.newStock).toBe(35);

      // Attempting to deduct more than available
      expect(() => {
        productService.updateVariantStock('var-1', -100);
      }).toThrow('Stock insuffisant');
    });
  });

  describe('Raw Materials Management', () => {
    it('should list materials and flag low stock items correctly', () => {
      const materials = materialService.listMaterials();
      expect(materials.length).toBeGreaterThanOrEqual(6);

      const kraftBoxes = materials.find(m => m.name.includes('Kraft'));
      expect(kraftBoxes).toBeDefined();
      // Seeded with stock 2, reorder point 4 -> isLowStock = true
      expect(kraftBoxes?.isLowStock).toBe(true);

      const lowStockOnly = materialService.listMaterials({ lowStockOnly: true });
      expect(lowStockOnly.some(m => m.id === 'mat-6')).toBe(true);
    });

    it('should adjust raw material stock and reject negative values', () => {
      const updated = materialService.adjustStock('mat-1', 5);
      expect(updated.stockQuantity).toBe(13); // 8 + 5

      expect(() => {
        materialService.adjustStock('mat-1', -50);
      }).toThrow('Stock matière insuffisant');
    });
  });

  describe('HTTP API Endpoints & Role Authorization', () => {
    it('GET /api/products should be accessible to all authenticated roles', async () => {
      const { token } = await authService.login('employee@zrfactory.dz', 'employee123456');

      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(3);
    });

    it('POST /api/products should allow EMPLOYEE to create product with cost components', async () => {
      const { token } = await authService.login('employee@zrfactory.dz', 'employee123456');

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Tote Bag Coton Personnalisé',
          sku: 'BAG-COT-004',
          description: 'Sac en toile de coton 280g',
          sellingPrice: 1200,
          costComponents: [
            { name: 'Tote Bag Vierge', type: CostComponentType.BASE_ITEM, cost: 300 },
            { name: 'Impression DTF A4', type: CostComponentType.PRINTING, cost: 200 },
            { name: 'Sachet Packaging', type: CostComponentType.PACKAGING, cost: 20 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.totalCost).toBe(520); // 300 + 200 + 20
      expect(res.body.data.product.grossProfit).toBe(680); // 1200 - 520
    });

    it('POST /api/products should FORBID VIEWER (403 Forbidden)', async () => {
      const { token } = await authService.login('viewer@zrfactory.dz', 'viewer123456');

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Forbidden Item',
          sku: 'FORB-001',
          sellingPrice: 1000,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/products should reject invalid data via Zod validation', async () => {
      const { token } = await authService.login('admin@zrfactory.dz', 'admin123456');

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '', // Invalid empty name
          sku: 'SKU',
          sellingPrice: -100, // Invalid negative price
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
