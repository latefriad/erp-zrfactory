import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { AccountingPeriodService } from '../src/services/accountingPeriodService';
import { PartnerService } from '../src/services/partnerService';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';

describe('Phase 7: Periodic Profit Distribution & Closed Periods', () => {
  let db: Database.Database;
  let periodService: AccountingPeriodService;
  let partnerService: PartnerService;
  let authService: AuthService;
  let app: any;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    periodService = new AccountingPeriodService(db);
    partnerService = new PartnerService(db);
    authService = new AuthService(db);
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Accounting Period P&L Calculation & Metrics', () => {
    it('should calculate live P&L metrics for an open period', () => {
      const periods = periodService.listPeriods();
      expect(periods.length).toBeGreaterThanOrEqual(2);

      const sept = periods.find(p => p.id === 'period-2026-09')!;
      expect(sept).toBeDefined();
      expect(sept.isClosed).toBe(false);
      expect(sept.isDistributed).toBe(false);

      // Seeded September orders and expenses should yield positive numbers
      expect(sept.revenue).toBeGreaterThan(0);
      expect(sept.cogs).toBeGreaterThan(0);
      expect(sept.operatingExpenses).toBeGreaterThan(0);
      expect(sept.grossProfit).toBe(sept.revenue - sept.cogs);
      expect(sept.netProfit).toBe(sept.grossProfit - sept.operatingExpenses);
      expect(sept.ordersCount).toBeGreaterThan(0);
      expect(sept.expensesCount).toBeGreaterThan(0);
    });

    it('should retrieve historical closed period with persisted values', () => {
      const aout = periodService.getPeriodById('period-2026-08');
      expect(aout).toBeDefined();
      expect(aout.isClosed).toBe(true);
      expect(aout.isDistributed).toBe(true);
      expect(aout.revenue).toBe(450000);
      expect(aout.cogs).toBe(180000);
      expect(aout.operatingExpenses).toBe(120000);
      expect(aout.grossProfit).toBe(270000);
      expect(aout.netProfit).toBe(150000);
      expect(aout.distributions).toHaveLength(2);

      const riadDist = aout.distributions.find(d => d.partnerId === 'partner-riad')!;
      expect(riadDist.ownershipPercentage).toBe(30.0);
      expect(riadDist.profitShare).toBe(45000);

      const brotherDist = aout.distributions.find(d => d.partnerId === 'partner-brother')!;
      expect(brotherDist.ownershipPercentage).toBe(70.0);
      expect(brotherDist.profitShare).toBe(105000);
    });
  });

  describe('Period Lifecycle: Creation, Closing & Reopening', () => {
    it('should create a new open accounting period', () => {
      const newPeriod = periodService.createPeriod(
        {
          name: 'Octobre 2026',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        },
        'usr-admin'
      );

      expect(newPeriod.id).toBeDefined();
      expect(newPeriod.name).toBe('Octobre 2026');
      expect(newPeriod.isClosed).toBe(false);
      expect(newPeriod.isDistributed).toBe(false);
    });

    it('should reject creating period with invalid dates', () => {
      expect(() => {
        periodService.createPeriod({
          name: 'Période Invalide',
          startDate: '2026-11-30',
          endDate: '2026-11-01',
        });
      }).toThrow(/postérieure/);
    });

    it('should close an open period and freeze financial numbers', () => {
      const septBefore = periodService.getPeriodById('period-2026-09');
      expect(septBefore.isClosed).toBe(false);

      const closed = periodService.closePeriod('period-2026-09', 'usr-admin', 'Administrateur ZR');
      expect(closed.isClosed).toBe(true);
      expect(closed.closedAt).toBeDefined();
      expect(closed.revenue).toBe(septBefore.revenue);
      expect(closed.netProfit).toBe(septBefore.netProfit);
    });

    it('should prevent closing an already closed period', () => {
      expect(() => {
        periodService.closePeriod('period-2026-08', 'usr-admin');
      }).toThrow(/déjà clôturée/);
    });

    it('should allow reopening a closed period that has not been distributed', () => {
      // First close Septembre 2026
      periodService.closePeriod('period-2026-09', 'usr-admin');
      
      // Reopen
      const reopened = periodService.reopenPeriod('period-2026-09', 'usr-admin');
      expect(reopened.isClosed).toBe(false);
      expect(reopened.closedAt).toBeNull();
    });

    it('should forbid reopening a period whose profits were already distributed', () => {
      expect(() => {
        periodService.reopenPeriod('period-2026-08', 'usr-admin');
      }).toThrow(/déjà été distribués/);
    });
  });

  describe('Profit Distribution & Partner Equity Crediting (30% Riad / 70% Brother)', () => {
    it('should distribute profits according to exact 30% / 70% equity split and credit partner balances', () => {
      // Prepare custom closed period with known net profit: 200,000 DA
      const period = periodService.createPeriod({
        name: 'T3 2026 Clôturé',
        startDate: '2026-07-01',
        endDate: '2026-09-30',
      });

      // Close it manually in DB to set a clean net profit of 200,000 DA
      db.prepare(`
        UPDATE accounting_periods
        SET is_closed = 1, closed_at = DATETIME('now'),
            revenue = 500000, cogs = 200000, operating_expenses = 100000,
            gross_profit = 300000, net_profit = 200000
        WHERE id = ?
      `).run(period.id);

      const riadBefore = partnerService.getPartnerById('partner-riad');
      const brotherBefore = partnerService.getPartnerById('partner-brother');

      // Distribute profits
      const result = periodService.distributeProfits(period.id, 'usr-admin', 'Administrateur ZR');

      expect(result.period.isDistributed).toBe(true);
      expect(result.distributions).toHaveLength(2);

      // Riad: 30% of 200,000 DA = 60,000 DA
      const riadShare = result.distributions.find(d => d.partnerId === 'partner-riad')!;
      expect(riadShare.ownershipPercentage).toBe(30.0);
      expect(riadShare.profitShare).toBe(60000);

      // Brother: 70% of 200,000 DA = 140,000 DA
      const brotherShare = result.distributions.find(d => d.partnerId === 'partner-brother')!;
      expect(brotherShare.ownershipPercentage).toBe(70.0);
      expect(brotherShare.profitShare).toBe(140000);

      // Verify partners' dynamic balances immediately credited
      const riadAfter = partnerService.getPartnerById('partner-riad');
      const brotherAfter = partnerService.getPartnerById('partner-brother');

      expect(riadAfter.currentBalance).toBe(riadBefore.currentBalance + 60000);
      expect(riadAfter.totalProfitDistributed).toBe(riadBefore.totalProfitDistributed + 60000);

      expect(brotherAfter.currentBalance).toBe(brotherBefore.currentBalance + 140000);
      expect(brotherAfter.totalProfitDistributed).toBe(brotherBefore.totalProfitDistributed + 140000);
    });

    it('should reject profit distribution on an open period', () => {
      expect(() => {
        periodService.distributeProfits('period-2026-09', 'usr-admin');
      }).toThrow(/doit obligatoirement être clôturée/);
    });

    it('should reject double profit distribution on the same period', () => {
      expect(() => {
        periodService.distributeProfits('period-2026-08', 'usr-admin');
      }).toThrow(/déjà été distribués/);
    });
  });

  describe('API Endpoints & Strict RBAC Security', () => {
    let adminToken: string;
    let riadToken: string;
    let employeeToken: string;
    let viewerToken: string;

    beforeEach(async () => {
      adminToken = (await authService.login('admin@zrfactory.dz', 'admin123456')).token;
      riadToken = (await authService.login('riad@zrfactory.dz', 'riad123456')).token;
      employeeToken = (await authService.login('employee@zrfactory.dz', 'employee123456')).token;
      viewerToken = (await authService.login('viewer@zrfactory.dz', 'viewer123456')).token;
    });

    it('should allow Admin and Partner to list periods via GET /api/accounting-periods', async () => {
      const res = await request(app)
        .get('/api/accounting-periods')
        .set('Authorization', `Bearer ${riadToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.periods.length).toBeGreaterThanOrEqual(2);
    });

    it('should block Employee from accessing accounting periods (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/accounting-periods')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow Admin to create a new period via POST /api/accounting-periods', async () => {
      const res = await request(app)
        .post('/api/accounting-periods')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Novembre 2026',
          startDate: '2026-11-01',
          endDate: '2026-11-30',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.period.name).toBe('Novembre 2026');
    });

    it('should forbid Partner from creating periods (Admin only)', async () => {
      const res = await request(app)
        .post('/api/accounting-periods')
        .set('Authorization', `Bearer ${riadToken}`)
        .send({
          name: 'Période Associé Non Permise',
          startDate: '2026-12-01',
          endDate: '2026-12-31',
        });

      expect(res.status).toBe(403);
    });

    it('should allow Admin to close period via POST /api/accounting-periods/:id/close', async () => {
      const res = await request(app)
        .post('/api/accounting-periods/period-2026-09/close')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.period.isClosed).toBe(true);
    });
  });
});
