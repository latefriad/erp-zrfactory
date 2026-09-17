import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { ReportService } from '../src/services/reportService';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';

describe('Phase 8: Financial Reports, Income Statement & Balance Sheet', () => {
  let db: Database.Database;
  let reportService: ReportService;
  let authService: AuthService;
  let app: any;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    reportService = new ReportService(db);
    authService = new AuthService(db);
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Income Statement (Compte de Résultat / P&L)', () => {
    it('should generate accurate P&L with itemized COGS and expense categories', () => {
      const pnl = reportService.getIncomeStatement('2026-09-01', '2026-09-30');

      expect(pnl.revenue).toBeGreaterThan(0);
      expect(pnl.cogs.total).toBeGreaterThan(0);
      // Itemized COGS
      expect(pnl.cogs.baseGarments).toBeGreaterThan(0);
      expect(pnl.cogs.printingDtf).toBeGreaterThan(0);
      expect(pnl.cogs.packaging).toBeGreaterThan(0);

      // Gross profit check
      expect(pnl.grossProfit).toBe(pnl.revenue - pnl.cogs.total);
      expect(pnl.grossMarginPercentage).toBeGreaterThan(0);

      // Operating expenses check
      expect(pnl.operatingExpenses.total).toBeGreaterThan(0);
      expect(pnl.operatingExpenses.byCategory.length).toBeGreaterThanOrEqual(1);

      // Verify category percentages sum close to 100%
      const sumCatPerc = pnl.operatingExpenses.byCategory.reduce((acc, c) => acc + c.percentage, 0);
      expect(sumCatPerc).toBeGreaterThanOrEqual(99);
      expect(sumCatPerc).toBeLessThanOrEqual(101);

      // Net profit check
      expect(pnl.netProfit).toBe(pnl.grossProfit - pnl.operatingExpenses.total);

      // Metrics check
      expect(pnl.metrics.ordersCount).toBeGreaterThan(0);
      expect(pnl.metrics.averageOrderValue).toBeGreaterThan(0);
      expect(pnl.metrics.expensesCount).toBeGreaterThan(0);
    });

    it('should handle zero-sales periods gracefully', () => {
      const pnl = reportService.getIncomeStatement('2025-01-01', '2025-01-31');
      expect(pnl.revenue).toBe(0);
      expect(pnl.cogs.total).toBe(0);
      expect(pnl.grossProfit).toBe(0);
      expect(pnl.grossMarginPercentage).toBe(0);
      expect(pnl.netProfit).toBe(0);
      expect(pnl.metrics.ordersCount).toBe(0);
      expect(pnl.metrics.averageOrderValue).toBe(0);
    });
  });

  describe('Simplified Balance Sheet (Bilan Simplifié)', () => {
    it('should compile assets (Cash + Raw Materials Stock + Receivables) and partner equity', () => {
      const sheet = reportService.getBalanceSheet('2026-09-30');

      expect(sheet.assets.cashAccounts.length).toBeGreaterThanOrEqual(3);
      expect(sheet.assets.totalCash).toBeGreaterThan(0);

      // Inventory valuation from seeded raw materials
      expect(sheet.assets.inventoryValuation).toBeGreaterThan(0);

      // Total assets
      expect(sheet.assets.totalAssets).toBe(
        sheet.assets.totalCash + sheet.assets.inventoryValuation + sheet.assets.customerReceivables
      );

      // Partner equity (Riad + Brother)
      expect(sheet.liabilitiesAndEquity.partnerBalances).toHaveLength(2);
      expect(sheet.liabilitiesAndEquity.totalPartnerEquity).toBeGreaterThan(0);
    });
  });

  describe('Product Margins Analysis', () => {
    it('should calculate revenue, cogs, and margin % per product model', () => {
      const margins = reportService.getProductMarginAnalysis('2026-09-01', '2026-09-30');

      expect(margins.length).toBeGreaterThanOrEqual(1);

      for (const item of margins) {
        expect(item.productId).toBeDefined();
        expect(item.productName).toBeDefined();
        expect(item.unitsSold).toBeGreaterThan(0);
        expect(item.revenue).toBeGreaterThan(0);
        expect(item.cogs).toBeGreaterThan(0);
        expect(item.grossProfit).toBe(item.revenue - item.cogs);
        expect(item.marginPercentage).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('API Endpoints & Strict RBAC Security', () => {
    let adminToken: string;
    let riadToken: string;
    let employeeToken: string;

    beforeEach(async () => {
      adminToken = (await authService.login('admin@zrfactory.dz', 'admin123456')).token;
      riadToken = (await authService.login('riad@zrfactory.dz', 'riad123456')).token;
      employeeToken = (await authService.login('employee@zrfactory.dz', 'employee123456')).token;
    });

    it('should allow Admin and Partner to access Income Statement via GET /api/reports/income-statement', async () => {
      const adminRes = await request(app)
        .get('/api/reports/income-statement?startDate=2026-09-01&endDate=2026-09-30')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
      expect(adminRes.body.data.incomeStatement.revenue).toBeGreaterThan(0);

      const partnerRes = await request(app)
        .get('/api/reports/income-statement?startDate=2026-09-01&endDate=2026-09-30')
        .set('Authorization', `Bearer ${riadToken}`);

      expect(partnerRes.status).toBe(200);
      expect(partnerRes.body.data.incomeStatement.revenue).toBeGreaterThan(0);
    });

    it('should allow Partner to access Balance Sheet via GET /api/reports/balance-sheet', async () => {
      const res = await request(app)
        .get('/api/reports/balance-sheet')
        .set('Authorization', `Bearer ${riadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.balanceSheet.assets.totalCash).toBeGreaterThan(0);
    });

    it('should block Employee from accessing financial reports (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/reports/income-statement')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });
});
