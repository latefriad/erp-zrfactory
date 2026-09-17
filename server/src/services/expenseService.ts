import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ValidationError } from '../utils/errors';
import { Expense, PaymentMethod, ExpenseCategory } from '@zr-erp/shared';

export interface CreateExpenseInput {
  categoryId: string;
  supplierId?: string | null;
  cashAccountId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  description: string;
  attachment?: string | null;
}

export interface ExpenseFilterOptions {
  categoryId?: string;
  supplierId?: string;
  cashAccountId?: string;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ExpenseCategoryBreakdown {
  id: string;
  name: string;
  description: string | null;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface ExpenseStats {
  totalAmount: number;
  totalCount: number;
  categories: ExpenseCategoryBreakdown[];
  byPaymentMethod: Record<string, number>;
}

export class ExpenseService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public listCategories(): Array<{ id: string; name: string; description: string | null }> {
    return this.db.prepare(`
      SELECT id, name, description 
      FROM expense_categories 
      ORDER BY name ASC
    `).all() as any[];
  }

  public createExpense(input: CreateExpenseInput, actorId?: string, actorName?: string): Expense {
    if (!input.categoryId) {
      throw new ValidationError('La catégorie de dépense est obligatoire');
    }
    if (!input.amount || input.amount <= 0) {
      throw new ValidationError('Le montant de la dépense doit être supérieur à 0');
    }
    if (!input.date) {
      throw new ValidationError('La date de la dépense est obligatoire');
    }
    if (!input.description || input.description.trim().length === 0) {
      throw new ValidationError('La description de la dépense est obligatoire');
    }

    // Verify category exists (by id or by name)
    const category = this.db.prepare(`
      SELECT id, name, description 
      FROM expense_categories 
      WHERE id = ? OR name = ?
    `).get(input.categoryId, input.categoryId) as any;

    if (!category) {
      throw new NotFoundError(`Catégorie de dépense introuvable: ${input.categoryId}`);
    }

    // Verify or select default cash account
    let cashAccount: any;
    if (input.cashAccountId) {
      cashAccount = this.db.prepare(`
        SELECT id, name, balance 
        FROM cash_accounts 
        WHERE id = ?
      `).get(input.cashAccountId);

      if (!cashAccount) {
        throw new NotFoundError(`Compte de trésorerie introuvable: ${input.cashAccountId}`);
      }
    } else {
      cashAccount = this.db.prepare(`
        SELECT id, name, balance 
        FROM cash_accounts 
        WHERE is_default = 1 
        LIMIT 1
      `).get();

      if (!cashAccount) {
        cashAccount = this.db.prepare(`SELECT id, name, balance FROM cash_accounts LIMIT 1`).get();
      }
    }

    if (!cashAccount) {
      throw new ValidationError('Aucun compte de trésorerie disponible pour imputer cette dépense');
    }

    // Check supplier if provided
    if (input.supplierId) {
      const supplierExists = this.db.prepare(`SELECT id FROM suppliers WHERE id = ?`).get(input.supplierId);
      if (!supplierExists) {
        throw new NotFoundError(`Fournisseur introuvable (ID: ${input.supplierId})`);
      }
    }

    const expenseId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const txId = `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const cleanAmount = Number(input.amount);
    const newBalance = Number(cashAccount.balance) - cleanAmount;

    // Transactional creation: expense record + cash account deduction + cash transaction ledger
    const transaction = this.db.transaction(() => {
      // 1. Insert expense
      this.db.prepare(`
        INSERT INTO expenses (
          id, category_id, supplier_id, cash_account_id, amount, payment_method,
          date, description, attachment, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        expenseId,
        category.id,
        input.supplierId || null,
        cashAccount.id,
        cleanAmount,
        input.paymentMethod || PaymentMethod.CASH,
        input.date,
        input.description.trim(),
        input.attachment || null,
        actorId || null,
        now
      );

      // 2. Decrement cash account balance
      this.db.prepare(`
        UPDATE cash_accounts 
        SET balance = ?, updated_at = ? 
        WHERE id = ?
      `).run(newBalance, now, cashAccount.id);

      // 3. Insert cash transaction
      this.db.prepare(`
        INSERT INTO cash_transactions (
          id, cash_account_id, type, amount, balance_after, date, description, reference_id, created_at
        ) VALUES (?, ?, 'EXPENSE', ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        cashAccount.id,
        cleanAmount,
        newBalance,
        input.date,
        `Dépense [${category.name}]: ${input.description.trim()}`,
        expenseId,
        now
      );

      // 4. Audit log
      this.logAudit({
        userId: actorId || null,
        userName: actorName || null,
        action: 'CREATE',
        entityType: 'EXPENSE',
        entityId: expenseId,
        newValue: JSON.stringify({
          category: category.name,
          amount: cleanAmount,
          cashAccount: cashAccount.name,
          paymentMethod: input.paymentMethod,
        }),
      });
    });

    transaction();

    return this.getExpenseById(expenseId);
  }

  public getExpenseById(id: string): Expense {
    const row = this.db.prepare(`
      SELECT 
        e.id, e.category_id, e.supplier_id, e.cash_account_id, e.amount, e.payment_method,
        e.date, e.description, e.attachment, e.created_by, e.created_at,
        c.name as category_name,
        s.name as supplier_name,
        ca.name as cash_account_name,
        u.name as created_by_name
      FROM expenses e
      JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN suppliers s ON s.id = e.supplier_id
      JOIN cash_accounts ca ON ca.id = e.cash_account_id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE e.id = ?
    `).get(id) as any;

    if (!row) {
      throw new NotFoundError(`Dépense introuvable (ID: ${id})`);
    }

    return {
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name || undefined,
      cashAccountId: row.cash_account_id,
      cashAccountName: row.cash_account_name,
      amount: Number(row.amount),
      paymentMethod: row.payment_method as PaymentMethod,
      date: row.date,
      description: row.description,
      attachment: row.attachment,
      createdBy: row.created_by,
      createdByName: row.created_by_name || undefined,
      createdAt: row.created_at,
    };
  }

  public listExpenses(filters?: ExpenseFilterOptions): Expense[] {
    let sql = `
      SELECT 
        e.id, e.category_id, e.supplier_id, e.cash_account_id, e.amount, e.payment_method,
        e.date, e.description, e.attachment, e.created_by, e.created_at,
        c.name as category_name,
        s.name as supplier_name,
        ca.name as cash_account_name,
        u.name as created_by_name
      FROM expenses e
      JOIN expense_categories c ON c.id = e.category_id
      LEFT JOIN suppliers s ON s.id = e.supplier_id
      JOIN cash_accounts ca ON ca.id = e.cash_account_id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.categoryId) {
      sql += ` AND (e.category_id = ? OR c.name = ?)`;
      params.push(filters.categoryId, filters.categoryId);
    }

    if (filters?.supplierId) {
      sql += ` AND e.supplier_id = ?`;
      params.push(filters.supplierId);
    }

    if (filters?.cashAccountId) {
      sql += ` AND e.cash_account_id = ?`;
      params.push(filters.cashAccountId);
    }

    if (filters?.paymentMethod) {
      sql += ` AND e.payment_method = ?`;
      params.push(filters.paymentMethod);
    }

    if (filters?.startDate) {
      sql += ` AND e.date >= ?`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ` AND e.date <= ?`;
      params.push(filters.endDate);
    }

    if (filters?.search) {
      sql += ` AND (e.description LIKE ? OR s.name LIKE ? OR c.name LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ` ORDER BY e.date DESC, e.created_at DESC`;

    if (filters?.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
      if (filters?.offset) {
        sql += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(r => ({
      id: r.id,
      categoryId: r.category_id,
      categoryName: r.category_name,
      supplierId: r.supplier_id,
      supplierName: r.supplier_name || undefined,
      cashAccountId: r.cash_account_id,
      cashAccountName: r.cash_account_name,
      amount: Number(r.amount),
      paymentMethod: r.payment_method as PaymentMethod,
      date: r.date,
      description: r.description,
      attachment: r.attachment,
      createdBy: r.created_by,
      createdByName: r.created_by_name || undefined,
      createdAt: r.created_at,
    }));
  }

  public getExpenseStats(query?: { startDate?: string; endDate?: string }): ExpenseStats {
    let dateFilter = '';
    const params: any[] = [];

    if (query?.startDate) {
      dateFilter += ` AND date >= ?`;
      params.push(query.startDate);
    }
    if (query?.endDate) {
      dateFilter += ` AND date <= ?`;
      params.push(query.endDate);
    }

    // Total expenses & count
    const totalRow = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as totalAmount, COUNT(*) as totalCount
      FROM expenses
      WHERE 1=1 ${dateFilter}
    `).get(...params) as any;

    const totalAmount = Number(totalRow?.totalAmount || 0);
    const totalCount = Number(totalRow?.totalCount || 0);

    // Breakdown by category
    const catRows = this.db.prepare(`
      SELECT 
        c.id, c.name, c.description,
        COUNT(e.id) as count,
        COALESCE(SUM(e.amount), 0) as totalAmount
      FROM expense_categories c
      LEFT JOIN expenses e ON e.category_id = c.id ${dateFilter ? dateFilter.replace(/date/g, 'e.date') : ''}
      GROUP BY c.id
      ORDER BY totalAmount DESC
    `).all(...params) as any[];

    const categories: ExpenseCategoryBreakdown[] = catRows.map(c => {
      const catAmount = Number(c.totalAmount || 0);
      const percentage = totalAmount > 0 ? Math.round((catAmount / totalAmount) * 100) : 0;
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        count: Number(c.count || 0),
        totalAmount: catAmount,
        percentage,
      };
    });

    // Breakdown by payment method
    const pmRows = this.db.prepare(`
      SELECT payment_method, COALESCE(SUM(amount), 0) as amount
      FROM expenses
      WHERE 1=1 ${dateFilter}
      GROUP BY payment_method
    `).all(...params) as any[];

    const byPaymentMethod: Record<string, number> = {};
    for (const pm of pmRows) {
      byPaymentMethod[pm.payment_method] = Number(pm.amount || 0);
    }

    return {
      totalAmount,
      totalCount,
      categories,
      byPaymentMethod,
    };
  }

  public deleteExpense(id: string, actorId?: string): void {
    const existing = this.getExpenseById(id);
    const now = new Date().toISOString();

    const transaction = this.db.transaction(() => {
      // 1. Restore cash account balance
      const account = this.db.prepare(`SELECT balance FROM cash_accounts WHERE id = ?`).get(existing.cashAccountId) as any;
      const restoredBalance = (account?.balance || 0) + existing.amount;

      this.db.prepare(`
        UPDATE cash_accounts 
        SET balance = ?, updated_at = ? 
        WHERE id = ?
      `).run(restoredBalance, now, existing.cashAccountId);

      // 2. Insert compensatory cash transaction
      const txId = `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO cash_transactions (
          id, cash_account_id, type, amount, balance_after, date, description, reference_id, created_at
        ) VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        existing.cashAccountId,
        existing.amount,
        restoredBalance,
        new Date().toISOString().split('T')[0],
        `Annulation de dépense [${existing.categoryName}]: ${existing.description}`,
        id,
        now
      );

      // 3. Delete expense
      this.db.prepare(`DELETE FROM expenses WHERE id = ?`).run(id);

      // 4. Audit
      this.logAudit({
        userId: actorId || null,
        action: 'DELETE',
        entityType: 'EXPENSE',
        entityId: id,
        oldValue: JSON.stringify({ amount: existing.amount, category: existing.categoryName }),
      });
    });

    transaction();
  }

  private logAudit(entry: {
    userId?: string | null;
    userName?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: string | null;
    newValue?: string | null;
  }) {
    try {
      const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, old_value, newValue, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
      `).run(
        id,
        entry.userId || null,
        entry.userName || null,
        entry.action,
        entry.entityType,
        entry.entityId,
        entry.oldValue || null,
        entry.newValue || null
      );
    } catch {
      // Ignore audit failure
    }
  }
}
