import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ValidationError, FinancialRuleError } from '../utils/errors';
import { CashAccount, CashTransaction, CashTransactionType } from '@zr-erp/shared';

export interface CreateCashAccountInput {
  name: string;
  type: 'CASH' | 'BANK' | 'CCP' | 'BARIDIMOB';
  balance?: number;
  currency?: string;
  isDefault?: boolean;
}

export interface TransferFundsInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description: string;
}

export interface CashTransactionFilterOptions {
  accountId?: string;
  type?: CashTransactionType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class CashService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public listAccounts(): CashAccount[] {
    const rows = this.db.prepare(`
      SELECT id, name, type, balance, currency, is_default, created_at, updated_at
      FROM cash_accounts
      ORDER BY is_default DESC, name ASC
    `).all() as any[];

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      balance: Number(r.balance || 0),
      currency: r.currency || 'DZD',
      isDefault: r.is_default === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  public getAccountById(id: string): CashAccount & { recentTransactions: CashTransaction[] } {
    const row = this.db.prepare(`
      SELECT id, name, type, balance, currency, is_default, created_at, updated_at
      FROM cash_accounts
      WHERE id = ?
    `).get(id) as any;

    if (!row) {
      throw new NotFoundError(`Compte de trésorerie introuvable (ID: ${id})`);
    }

    const txRows = this.db.prepare(`
      SELECT id, cash_account_id, type, amount, balance_after, date, description, reference_id, created_at
      FROM cash_transactions
      WHERE cash_account_id = ?
      ORDER BY date DESC, created_at DESC
      LIMIT 25
    `).all(id) as any[];

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      balance: Number(row.balance || 0),
      currency: row.currency || 'DZD',
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      recentTransactions: txRows.map(t => ({
        id: t.id,
        cashAccountId: t.cash_account_id,
        type: t.type as CashTransactionType,
        amount: Number(t.amount),
        balanceAfter: Number(t.balance_after),
        date: t.date,
        description: t.description,
        referenceId: t.reference_id,
        createdAt: t.created_at,
      })),
    };
  }

  public createAccount(input: CreateCashAccountInput, actorId?: string): CashAccount {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Le nom du compte est obligatoire');
    }
    if (!['CASH', 'BANK', 'CCP', 'BARIDIMOB'].includes(input.type)) {
      throw new ValidationError('Type de compte invalide (CASH, BANK, CCP, BARIDIMOB)');
    }

    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const initialBalance = Math.max(0, input.balance || 0);
    const isDefault = input.isDefault ? 1 : 0;

    const transaction = this.db.transaction(() => {
      if (isDefault === 1) {
        this.db.prepare(`UPDATE cash_accounts SET is_default = 0`).run();
      }

      this.db.prepare(`
        INSERT INTO cash_accounts (id, name, type, balance, currency, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        input.name.trim(),
        input.type,
        initialBalance,
        input.currency || 'DZD',
        isDefault,
        now,
        now
      );

      if (initialBalance > 0) {
        const txId = `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        this.db.prepare(`
          INSERT INTO cash_transactions (
            id, cash_account_id, type, amount, balance_after, date, description, reference_id, created_at
          ) VALUES (?, ?, 'ADJUSTMENT', ?, ?, ?, ?, ?, ?)
        `).run(
          txId,
          id,
          initialBalance,
          initialBalance,
          now.split('T')[0],
          'Solde initial d\'ouverture de compte',
          null,
          now
        );
      }

      this.logAudit({
        userId: actorId || null,
        action: 'CREATE',
        entityType: 'CASH_ACCOUNT',
        entityId: id,
        newValue: JSON.stringify({ name: input.name, type: input.type, balance: initialBalance }),
      });
    });

    transaction();

    return this.getAccountById(id);
  }

  public transferFunds(input: TransferFundsInput, actorId?: string, actorName?: string): { success: boolean; fromBalance: number; toBalance: number } {
    if (!input.amount || input.amount <= 0) {
      throw new ValidationError('Le montant du transfert doit être supérieur à 0');
    }
    if (!input.fromAccountId || !input.toAccountId) {
      throw new ValidationError('Les comptes source et destination sont obligatoires');
    }
    if (input.fromAccountId === input.toAccountId) {
      throw new ValidationError('Le compte source et le compte destination doivent être différents');
    }

    const fromAccount = this.db.prepare(`SELECT id, name, balance FROM cash_accounts WHERE id = ?`).get(input.fromAccountId) as any;
    if (!fromAccount) {
      throw new NotFoundError(`Compte source introuvable: ${input.fromAccountId}`);
    }

    const toAccount = this.db.prepare(`SELECT id, name, balance FROM cash_accounts WHERE id = ?`).get(input.toAccountId) as any;
    if (!toAccount) {
      throw new NotFoundError(`Compte destination introuvable: ${input.toAccountId}`);
    }

    const cleanAmount = Number(input.amount);
    const fromCurrentBalance = Number(fromAccount.balance);

    if (fromCurrentBalance < cleanAmount) {
      throw new FinancialRuleError(
        `Fonds insuffisants sur ${fromAccount.name}. Solde disponible: ${fromCurrentBalance} DA, transfert demandé: ${cleanAmount} DA`
      );
    }

    const now = new Date().toISOString();
    const date = input.date || now.split('T')[0];
    const newFromBalance = fromCurrentBalance - cleanAmount;
    const newToBalance = Number(toAccount.balance) + cleanAmount;

    const txOutId = `ctx-${Date.now()}-out-${Math.random().toString(36).substring(2, 6)}`;
    const txInId = `ctx-${Date.now()}-in-${Math.random().toString(36).substring(2, 6)}`;

    const transaction = this.db.transaction(() => {
      // 1. Debit from account
      this.db.prepare(`UPDATE cash_accounts SET balance = ?, updated_at = ? WHERE id = ?`).run(
        newFromBalance,
        now,
        fromAccount.id
      );

      // 2. Credit to account
      this.db.prepare(`UPDATE cash_accounts SET balance = ?, updated_at = ? WHERE id = ?`).run(
        newToBalance,
        now,
        toAccount.id
      );

      // 3. Post TRANSFER_OUT
      this.db.prepare(`
        INSERT INTO cash_transactions (
          id, cash_account_id, type, amount, balance_after, date, description, reference_id, created_at
        ) VALUES (?, ?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?)
      `).run(
        txOutId,
        fromAccount.id,
        cleanAmount,
        newFromBalance,
        date,
        `Virement vers ${toAccount.name}: ${input.description.trim()}`,
        txInId,
        now
      );

      // 4. Post TRANSFER_IN
      this.db.prepare(`
        INSERT INTO cash_transactions (
          id, cash_account_id, type, amount, balance_after, date, description, reference_id, created_at
        ) VALUES (?, ?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?)
      `).run(
        txInId,
        toAccount.id,
        cleanAmount,
        newToBalance,
        date,
        `Virement depuis ${fromAccount.name}: ${input.description.trim()}`,
        txOutId,
        now
      );

      // 5. Audit
      this.logAudit({
        userId: actorId || null,
        userName: actorName || null,
        action: 'TRANSFER_FUNDS',
        entityType: 'CASH_ACCOUNT',
        entityId: fromAccount.id,
        newValue: JSON.stringify({
          from: fromAccount.name,
          to: toAccount.name,
          amount: cleanAmount,
          description: input.description,
        }),
      });
    });

    transaction();

    return {
      success: true,
      fromBalance: newFromBalance,
      toBalance: newToBalance,
    };
  }

  public listTransactions(filters?: CashTransactionFilterOptions): CashTransaction[] {
    let sql = `
      SELECT 
        ct.id, ct.cash_account_id, ct.type, ct.amount, ct.balance_after, ct.date, ct.description, ct.reference_id, ct.created_at,
        ca.name as cash_account_name
      FROM cash_transactions ct
      JOIN cash_accounts ca ON ca.id = ct.cash_account_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.accountId) {
      sql += ` AND ct.cash_account_id = ?`;
      params.push(filters.accountId);
    }

    if (filters?.type) {
      sql += ` AND ct.type = ?`;
      params.push(filters.type);
    }

    if (filters?.startDate) {
      sql += ` AND ct.date >= ?`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ` AND ct.date <= ?`;
      params.push(filters.endDate);
    }

    sql += ` ORDER BY ct.date DESC, ct.created_at DESC`;

    if (filters?.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
      if (filters?.offset) {
        sql += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(t => ({
      id: t.id,
      cashAccountId: t.cash_account_id,
      type: t.type as CashTransactionType,
      amount: Number(t.amount),
      balanceAfter: Number(t.balance_after),
      date: t.date,
      description: t.description,
      referenceId: t.reference_id,
      createdAt: t.created_at,
    }));
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
