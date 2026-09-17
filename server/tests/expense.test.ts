import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { ExpenseService } from '../src/services/expenseService';
import { SupplierService } from '../src/services/supplierService';
import { AuthService } from '../src/services/authService';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';
import { setDatabaseInstance, closeDatabase } from '../src/db/connection';
import { PaymentMethod } from '@zr-erp/shared';

describe('Phase 5: Expense Management, Suppliers & Cash Account Deductions', () => {
  let db: Database.Database;
  let expenseService: ExpenseService;
  let supplierService: SupplierService;
  let authService: AuthService;
  let app: any;

  beforeEach(() => {
    db = new Database(':memory:');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    seedDatabase(db);
    setDatabaseInstance(db);

    expenseService = new ExpenseService(db);
    supplierService = new SupplierService(db);
    authService = new AuthService(db);
    app = createApp();
  });

  afterEach(() => {
    closeDatabase();
  });

  describe('Supplier Management & Procurement Stats', () => {
    it('should create a new Algerian supplier', () => {
      const supplier = supplierService.createSupplier({
        name: 'Fournisseur DTF Oran',
        phone: '041223344',
        email: 'dtf.oran@gmail.com',
        address: 'Zone Industrielle Es Senia',
        notes: 'Poudre et colle DTF',
      });

      expect(supplier.id).toBeDefined();
      expect(supplier.name).toBe('Fournisseur DTF Oran');
      expect(supplier.purchasesCount).toBe(0);
      expect(supplier.totalPurchased).toBe(0);
    });

    it('should calculate supplier procurement totals from linked expenses', () => {
      // Seeded supplier 'supp-textile-blida' has seeded expense exp-seed-001 (140,000 DA)
      const supplier = supplierService.getSupplierById('supp-textile-blida');
      expect(supplier.purchasesCount).toBeGreaterThanOrEqual(1);
      expect(supplier.totalPurchased).toBeGreaterThanOrEqual(140000);
    });

    it('should prevent deleting a supplier that has linked expenses', () => {
      expect(() => {
        supplierService.deleteSupplier('supp-textile-blida');
      }).toThrow(/Impossible de supprimer le fournisseur/);
    });
  });

  describe('Expense Creation, Category Breakdown & Double-Entry Cash Movements', () => {
    it('should list all 13 standard expense categories', () => {
      const categories = expenseService.listCategories();
      expect(categories.length).toBe(13);
      const names = categories.map(c => c.name);
      expect(names).toContain('MATERIALS');
      expect(names).toContain('T_SHIRTS');
      expect(names).toContain('PRINTING');
      expect(names).toContain('PACKAGING');
      expect(names).toContain('DELIVERY');
      expect(names).toContain('ADVERTISING');
      expect(names).toContain('RENT');
    });

    it('should create an expense, decrement cash account balance and post cash_transaction', () => {
      // Set initial balance of default cash account to 100,000 DA
      db.prepare(`UPDATE cash_accounts SET balance = 100000 WHERE id = 'acc-caisse-principale'`).run();

      const expense = expenseService.createExpense({
        categoryId: 'cat-printing',
        supplierId: 'supp-dtf-alger',
        cashAccountId: 'acc-caisse-principale',
        amount: 25000,
        paymentMethod: PaymentMethod.BARIDIMOB,
        date: '2026-09-15',
        description: 'Achat rouleau DTF 60cm',
      });

      expect(expense.id).toBeDefined();
      expect(expense.amount).toBe(25000);
      expect(expense.categoryName).toBe('PRINTING');

      // Cash account balance should now be 75,000 DA (100,000 - 25,000)
      const cashAccount = db.prepare(`SELECT balance FROM cash_accounts WHERE id = 'acc-caisse-principale'`).get() as any;
      expect(cashAccount.balance).toBe(75000);

      // Cash transaction ledger record must exist
      const tx = db.prepare(`SELECT * FROM cash_transactions WHERE reference_id = ?`).get(expense.id) as any;
      expect(tx).toBeDefined();
      expect(tx.type).toBe('EXPENSE');
      expect(tx.amount).toBe(25000);
      expect(tx.balance_after).toBe(75000);
    });

    it('should restore cash balance when an expense is deleted', () => {
      // Set initial balance to 50,000 DA
      db.prepare(`UPDATE cash_accounts SET balance = 50000 WHERE id = 'acc-caisse-principale'`).run();

      const expense = expenseService.createExpense({
        categoryId: 'cat-software',
        amount: 5000,
        paymentMethod: PaymentMethod.CASH,
        date: '2026-09-15',
        description: 'Abonnement Cloud ERP',
      });

      expect((db.prepare(`SELECT balance FROM cash_accounts WHERE id = 'acc-caisse-principale'`).get() as any).balance).toBe(45000);

      // Delete expense
      expenseService.deleteExpense(expense.id);

      // Balance should be restored back to 50,000 DA
      expect((db.prepare(`SELECT balance FROM cash_accounts WHERE id = 'acc-caisse-principale'`).get() as any).balance).toBe(50000);
    });

    it('should aggregate expense statistics and category breakdown', () => {
      const stats = expenseService.getExpenseStats();

      expect(stats.totalAmount).toBeGreaterThan(0);
      expect(stats.totalCount).toBeGreaterThanOrEqual(6);
      expect(stats.categories.length).toBeGreaterThan(0);

      // Categories should have totalAmount and percentage
      const tshirtsCat = stats.categories.find(c => c.name === 'T_SHIRTS');
      expect(tshirtsCat).toBeDefined();
      expect(tshirtsCat?.totalAmount).toBeGreaterThanOrEqual(140000);
      expect(tshirtsCat?.percentage).toBeGreaterThan(0);

      // Payment method breakdown
      expect(stats.byPaymentMethod['BANK_TRANSFER']).toBeDefined();
      expect(stats.byPaymentMethod['BARIDIMOB']).toBeDefined();
      expect(stats.byPaymentMethod['CASH']).toBeDefined();
    });
  });

  describe('HTTP API & Strict Financial RBAC', () => {
    it('should allow Admin to list and create expenses', async () => {
      const loginRes = await authService.login('admin@zrfactory.dz', 'admin123456');
      const token = loginRes.token;

      // GET /api/expenses
      const listRes = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.expenses.length).toBeGreaterThanOrEqual(1);

      // POST /api/expenses
      const createRes = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 'cat-equipment',
          amount: 85000,
          paymentMethod: PaymentMethod.CASH,
          date: '2026-09-16',
          description: 'Achat Presse à chaud pneumatique 40x50',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.expense.amount).toBe(85000);
    });

    it('should allow Partner to view expenses and stats', async () => {
      const loginRes = await authService.login('riad@zrfactory.dz', 'riad123456');
      const token = loginRes.token;

      const statsRes = await request(app)
        .get('/api/expenses/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.data.stats.totalAmount).toBeGreaterThan(0);
    });

    it('should strictly block Employee from accessing expenses (403 Forbidden)', async () => {
      const loginRes = await authService.login('employee@zrfactory.dz', 'employee123456');
      const token = loginRes.token;

      // GET /api/expenses
      const listRes = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.status).toBe(403);

      // POST /api/expenses
      const createRes = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${token}`)
        .send({
          categoryId: 'cat-other',
          amount: 1000,
          paymentMethod: PaymentMethod.CASH,
          date: '2026-09-16',
          description: 'Test dépense employé',
        });

      expect(createRes.status).toBe(403);
    });

    it('should allow Employee to view and register Suppliers for inventory orders', async () => {
      const loginRes = await authService.login('employee@zrfactory.dz', 'employee123456');
      const token = loginRes.token;

      // List suppliers
      const listRes = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.status).toBe(200);

      // Create supplier
      const createRes = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Nouveau Fournisseur Carton Constantine',
          phone: '031998877',
          address: 'Zone Industrielle Didouche Mourad',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.supplier.name).toBe('Nouveau Fournisseur Carton Constantine');
    });
  });
});
