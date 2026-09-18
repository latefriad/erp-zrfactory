import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseMigrator } from '../src/db/migrator';
import { seedDatabase } from '../src/db/seed';

describe('Database Architecture & Integrity', () => {
  let db: Database.Database;

  beforeEach(() => {
    // In-memory test database
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
  });

  afterEach(() => {
    db.close();
  });

  it('should enable foreign keys pragma', () => {
    const fkRow = db.pragma('foreign_keys') as [{ foreign_keys: number }];
    expect(fkRow[0].foreign_keys).toBe(1);
  });

  it('should have created all essential tables', () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[];

    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('users');
    expect(tableNames).toContain('roles');
    expect(tableNames).toContain('partners');
    expect(tableNames).toContain('partner_transactions');
    expect(tableNames).toContain('accounting_periods');
    expect(tableNames).toContain('profit_distributions');
    expect(tableNames).toContain('cash_accounts');
    expect(tableNames).toContain('cash_transactions');
    expect(tableNames).toContain('customers');
    expect(tableNames).toContain('suppliers');
    expect(tableNames).toContain('products');
    expect(tableNames).toContain('product_cost_components');
    expect(tableNames).toContain('orders');
    expect(tableNames).toContain('order_items');
    expect(tableNames).toContain('expenses');
    expect(tableNames).toContain('expense_categories');
    expect(tableNames).toContain('audit_logs');
    expect(tableNames).toContain('settings');
  });

  it('should enforce foreign key constraint when inserting invalid reference', () => {
    // Attempting to insert an order with a non-existent customer_id
    const insertInvalidOrder = () => {
      db.prepare(`
        INSERT INTO orders (id, order_number, customer_id, status, payment_status, subtotal, total, cost, profit)
        VALUES ('ord-test', 'ORD-001', 'non-existent-cust', 'PENDING', 'UNPAID', 1000, 1000, 400, 600)
      `).run();
    };

    expect(insertInvalidOrder).toThrow();
  });

  it('should seed default partners and verify 30% / 70% ownership', () => {
    seedDatabase(db);

    const partners = db.prepare('SELECT name, ownership_percentage FROM partners ORDER BY name ASC').all() as {
      name: string;
      ownership_percentage: number;
    }[];

    expect(partners.length).toBeGreaterThanOrEqual(2);

    const brother = partners.find(p => p.name === 'Brother');
    const riad = partners.find(p => p.name === 'Riad');

    expect(brother?.ownership_percentage).toBe(70);
    expect(riad?.ownership_percentage).toBe(30);
    expect((brother?.ownership_percentage || 0) + (riad?.ownership_percentage || 0)).toBe(100);
  });
});
