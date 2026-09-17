import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ValidationError, FinancialRuleError, ForbiddenError } from '../utils/errors';
import { Partner, PartnerTransaction, PartnerTransactionType, UserRole } from '@zr-erp/shared';
import { UserSessionPayload } from './authService';

export interface RecordPartnerTransactionInput {
  partnerId: string;
  amount: number;
  cashAccountId?: string | null;
  date: string;
  description: string;
  reference?: string | null;
}

export class PartnerService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public listPartners(viewer?: UserSessionPayload): Partner[] {
    const rows = this.db.prepare(`
      SELECT id, name, ownership_percentage, initial_capital, phone, email, notes, created_at, updated_at
      FROM partners
      ORDER BY ownership_percentage ASC
    `).all() as any[];

    return rows.map(r => this.computePartnerMetrics(r));
  }

  public getPartnerById(id: string, viewer?: UserSessionPayload): Partner & { recentTransactions: PartnerTransaction[] } {
    // If viewer is a partner, enforce partner self-isolation check if requested
    if (viewer && viewer.role === UserRole.PARTNER && viewer.partnerId && viewer.partnerId !== id) {
      throw new ForbiddenError('Vous ne pouvez consulter que votre propre compte associé.');
    }

    const row = this.db.prepare(`
      SELECT id, name, ownership_percentage, initial_capital, phone, email, notes, created_at, updated_at
      FROM partners
      WHERE id = ?
    `).get(id) as any;

    if (!row) {
      throw new NotFoundError(`Associé introuvable (ID: ${id})`);
    }

    const partner = this.computePartnerMetrics(row);

    const txRows = this.db.prepare(`
      SELECT 
        pt.id, pt.partner_id, pt.type, pt.amount, pt.date, pt.description, pt.reference,
        pt.accounting_period_id, pt.created_by, pt.created_at,
        p.name as partner_name,
        u.name as created_by_name
      FROM partner_transactions pt
      JOIN partners p ON p.id = pt.partner_id
      LEFT JOIN users u ON u.id = pt.created_by
      WHERE pt.partner_id = ?
      ORDER BY pt.date DESC, pt.created_at DESC
      LIMIT 30
    `).all(id) as any[];

    return {
      ...partner,
      recentTransactions: txRows.map(t => ({
        id: t.id,
        partnerId: t.partner_id,
        partnerName: t.partner_name,
        type: t.type as PartnerTransactionType,
        amount: Number(t.amount),
        date: t.date,
        description: t.description,
        reference: t.reference,
        accountingPeriodId: t.accounting_period_id,
        createdAt: t.created_at,
        createdBy: t.created_by,
        createdByName: t.created_by_name || undefined,
      })),
    };
  }

  public recordContribution(
    input: RecordPartnerTransactionInput,
    actorId?: string,
    actorName?: string
  ): PartnerTransaction {
    if (!input.amount || input.amount <= 0) {
      throw new ValidationError('Le montant de l\'apport doit être supérieur à 0');
    }
    if (!input.partnerId) {
      throw new ValidationError('L\'associé est obligatoire');
    }

    const partner = this.db.prepare(`SELECT id, name FROM partners WHERE id = ?`).get(input.partnerId) as any;
    if (!partner) {
      throw new NotFoundError(`Associé introuvable: ${input.partnerId}`);
    }

    // Resolve cash account to credit
    let cashAccount: any;
    if (input.cashAccountId) {
      cashAccount = this.db.prepare(`SELECT id, name, balance FROM cash_accounts WHERE id = ?`).get(input.cashAccountId);
      if (!cashAccount) {
        throw new NotFoundError(`Compte de trésorerie introuvable: ${input.cashAccountId}`);
      }
    } else {
      cashAccount = this.db.prepare(`SELECT id, name, balance FROM cash_accounts WHERE is_default = 1 LIMIT 1`).get();
      if (!cashAccount) {
        cashAccount = this.db.prepare(`SELECT id, name, balance FROM cash_accounts LIMIT 1`).get();
      }
    }

    if (!cashAccount) {
      throw new ValidationError('Aucun compte de trésorerie disponible pour recevoir cet apport');
    }

    const txId = `ptx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ctxId = `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const cleanAmount = Number(input.amount);
    const date = input.date || now.split('T')[0];
    const newCashBalance = Number(cashAccount.balance) + cleanAmount;

    const transaction = this.db.transaction(() => {
      // 1. Insert into partner_transactions
      this.db.prepare(`
        INSERT INTO partner_transactions (
          id, partner_id, type, amount, date, description, reference, created_by, created_at
        ) VALUES (?, ?, 'CONTRIBUTION', ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        partner.id,
        cleanAmount,
        date,
        input.description.trim(),
        input.reference || null,
        actorId || null,
        now
      );

      // 2. Increment cash account balance
      this.db.prepare(`UPDATE cash_accounts SET balance = ?, updated_at = ? WHERE id = ?`).run(
        newCashBalance,
        now,
        cashAccount.id
      );

      // 3. Post double-entry cash transaction
      this.db.prepare(`
        INSERT INTO cash_transactions (
          id, cash_account_id, type, amount, balance_after, date, description, reference_id, created_at
        ) VALUES (?, ?, 'PARTNER_CONTRIBUTION', ?, ?, ?, ?, ?, ?)
      `).run(
        ctxId,
        cashAccount.id,
        cleanAmount,
        newCashBalance,
        date,
        `Apport de capital [${partner.name}]: ${input.description.trim()}`,
        txId,
        now
      );

      // 4. Audit
      this.logAudit({
        userId: actorId || null,
        userName: actorName || null,
        action: 'PARTNER_CONTRIBUTION',
        entityType: 'PARTNER',
        entityId: partner.id,
        newValue: JSON.stringify({
          partner: partner.name,
          amount: cleanAmount,
          cashAccount: cashAccount.name,
        }),
      });
    });

    transaction();

    return {
      id: txId,
      partnerId: partner.id,
      partnerName: partner.name,
      type: PartnerTransactionType.CONTRIBUTION,
      amount: cleanAmount,
      date,
      description: input.description,
      reference: input.reference || null,
      cashAccountId: cashAccount.id,
      cashAccountName: cashAccount.name,
      createdAt: now,
      createdBy: actorId || '',
      createdByName: actorName,
    };
  }

  public recordWithdrawal(
    input: RecordPartnerTransactionInput,
    actorId?: string,
    actorName?: string
  ): PartnerTransaction {
    if (!input.amount || input.amount <= 0) {
      throw new ValidationError('Le montant du retrait doit être supérieur à 0');
    }
    if (!input.partnerId) {
      throw new ValidationError('L\'associé est obligatoire');
    }

    const partner = this.db.prepare(`SELECT id, name FROM partners WHERE id = ?`).get(input.partnerId) as any;
    if (!partner) {
      throw new NotFoundError(`Associé introuvable: ${input.partnerId}`);
    }

    // Resolve cash account to debit
    let cashAccount: any;
    if (input.cashAccountId) {
      cashAccount = this.db.prepare(`SELECT id, name, balance FROM cash_accounts WHERE id = ?`).get(input.cashAccountId);
      if (!cashAccount) {
        throw new NotFoundError(`Compte de trésorerie introuvable: ${input.cashAccountId}`);
      }
    } else {
      cashAccount = this.db.prepare(`SELECT id, name, balance FROM cash_accounts WHERE is_default = 1 LIMIT 1`).get();
      if (!cashAccount) {
        cashAccount = this.db.prepare(`SELECT id, name, balance FROM cash_accounts LIMIT 1`).get();
      }
    }

    if (!cashAccount) {
      throw new ValidationError('Aucun compte de trésorerie disponible pour prélever ce retrait');
    }

    const cleanAmount = Number(input.amount);
    const cashBalance = Number(cashAccount.balance);

    // Hard check: ensure cash account has sufficient liquidity
    if (cashBalance < cleanAmount) {
      throw new FinancialRuleError(
        `Fonds insuffisants sur ${cashAccount.name}. Solde disponible: ${cashBalance} DA, retrait demandé: ${cleanAmount} DA`
      );
    }

    const txId = `ptx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const ctxId = `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const date = input.date || now.split('T')[0];
    const newCashBalance = cashBalance - cleanAmount;

    const transaction = this.db.transaction(() => {
      // 1. Insert into partner_transactions
      this.db.prepare(`
        INSERT INTO partner_transactions (
          id, partner_id, type, amount, date, description, reference, created_by, created_at
        ) VALUES (?, ?, 'WITHDRAWAL', ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        partner.id,
        cleanAmount,
        date,
        input.description.trim(),
        input.reference || null,
        actorId || null,
        now
      );

      // 2. Decrement cash account balance
      this.db.prepare(`UPDATE cash_accounts SET balance = ?, updated_at = ? WHERE id = ?`).run(
        newCashBalance,
        now,
        cashAccount.id
      );

      // 3. Post double-entry cash transaction
      this.db.prepare(`
        INSERT INTO cash_transactions (
          id, cash_account_id, type, amount, balance_after, date, description, reference_id, created_at
        ) VALUES (?, ?, 'PARTNER_WITHDRAWAL', ?, ?, ?, ?, ?, ?)
      `).run(
        ctxId,
        cashAccount.id,
        cleanAmount,
        newCashBalance,
        date,
        `Retrait associé [${partner.name}]: ${input.description.trim()}`,
        txId,
        now
      );

      // 4. Audit
      this.logAudit({
        userId: actorId || null,
        userName: actorName || null,
        action: 'PARTNER_WITHDRAWAL',
        entityType: 'PARTNER',
        entityId: partner.id,
        newValue: JSON.stringify({
          partner: partner.name,
          amount: cleanAmount,
          cashAccount: cashAccount.name,
        }),
      });
    });

    transaction();

    return {
      id: txId,
      partnerId: partner.id,
      partnerName: partner.name,
      type: PartnerTransactionType.WITHDRAWAL,
      amount: cleanAmount,
      date,
      description: input.description,
      reference: input.reference || null,
      cashAccountId: cashAccount.id,
      cashAccountName: cashAccount.name,
      createdAt: now,
      createdBy: actorId || '',
      createdByName: actorName,
    };
  }

  public listAllTransactions(filters?: { partnerId?: string; limit?: number }): PartnerTransaction[] {
    let sql = `
      SELECT 
        pt.id, pt.partner_id, pt.type, pt.amount, pt.date, pt.description, pt.reference,
        pt.accounting_period_id, pt.created_by, pt.created_at,
        p.name as partner_name,
        u.name as created_by_name
      FROM partner_transactions pt
      JOIN partners p ON p.id = pt.partner_id
      LEFT JOIN users u ON u.id = pt.created_by
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.partnerId) {
      sql += ` AND pt.partner_id = ?`;
      params.push(filters.partnerId);
    }

    sql += ` ORDER BY pt.date DESC, pt.created_at DESC`;

    if (filters?.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(t => ({
      id: t.id,
      partnerId: t.partner_id,
      partnerName: t.partner_name,
      type: t.type as PartnerTransactionType,
      amount: Number(t.amount),
      date: t.date,
      description: t.description,
      reference: t.reference,
      accountingPeriodId: t.accounting_period_id,
      createdAt: t.created_at,
      createdBy: t.created_by,
      createdByName: t.created_by_name || undefined,
    }));
  }

  public updatePartner(
    id: string,
    data: {
      name?: string;
      ownershipPercentage?: number;
      phone?: string | null;
      email?: string | null;
      notes?: string | null;
    },
    actorId?: string,
    actorName?: string
  ): Partner {
    const existing = this.db.prepare(`SELECT * FROM partners WHERE id = ?`).get(id) as any;
    if (!existing) {
      throw new NotFoundError(`Associé introuvable (ID: ${id})`);
    }

    if (data.ownershipPercentage !== undefined) {
      const pct = Number(data.ownershipPercentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        throw new ValidationError('La quote-part statutaire doit être comprise entre 0 et 100%');
      }
    }

    const now = new Date().toISOString();
    const updatedName = data.name !== undefined ? data.name : existing.name;
    const updatedPercentage = data.ownershipPercentage !== undefined ? Number(data.ownershipPercentage) : Number(existing.ownership_percentage);
    const updatedPhone = data.phone !== undefined ? data.phone : existing.phone;
    const updatedEmail = data.email !== undefined ? data.email : existing.email;
    const updatedNotes = data.notes !== undefined ? data.notes : existing.notes;

    this.db.prepare(`
      UPDATE partners
      SET name = ?, ownership_percentage = ?, phone = ?, email = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedName, updatedPercentage, updatedPhone, updatedEmail, updatedNotes, now, id);

    // Sync settings if standard partner IDs
    if (id === 'partner-riad' && data.ownershipPercentage !== undefined) {
      this.db.prepare(`UPDATE settings SET value = ?, updated_at = ? WHERE key = 'partner_split_riad'`).run(String(updatedPercentage), now);
    } else if (id === 'partner-brother' && data.ownershipPercentage !== undefined) {
      this.db.prepare(`UPDATE settings SET value = ?, updated_at = ? WHERE key = 'partner_split_brother'`).run(String(updatedPercentage), now);
    }

    this.logAudit({
      userId: actorId || null,
      userName: actorName || null,
      action: 'UPDATE_PARTNER',
      entityType: 'PARTNER',
      entityId: id,
      oldValue: JSON.stringify({ name: existing.name, ownershipPercentage: existing.ownership_percentage }),
      newValue: JSON.stringify({ name: updatedName, ownershipPercentage: updatedPercentage }),
    });

    const updatedRow = this.db.prepare(`SELECT * FROM partners WHERE id = ?`).get(id) as any;
    return this.computePartnerMetrics(updatedRow);
  }

  private computePartnerMetrics(row: any): Partner {
    const stats = this.db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'CONTRIBUTION' THEN amount ELSE 0 END), 0) as total_contributions,
        COALESCE(SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) as total_withdrawals,
        COALESCE(SUM(CASE WHEN type = 'PROFIT_DISTRIBUTION' THEN amount ELSE 0 END), 0) as total_profit_distributed
      FROM partner_transactions
      WHERE partner_id = ?
    `).get(row.id) as any;

    const initialCapital = Number(row.initial_capital || 0);
    const totalContributions = Number(stats?.total_contributions || 0);
    const totalWithdrawals = Number(stats?.total_withdrawals || 0);
    const totalProfitDistributed = Number(stats?.total_profit_distributed || 0);

    // Current balance = initialCapital + contributions + profitShares - withdrawals
    const currentBalance = initialCapital + totalContributions + totalProfitDistributed - totalWithdrawals;

    return {
      id: row.id,
      name: row.name,
      ownershipPercentage: Number(row.ownership_percentage),
      initialCapital,
      totalContributions,
      totalWithdrawals,
      totalProfitDistributed,
      currentBalance,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
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
