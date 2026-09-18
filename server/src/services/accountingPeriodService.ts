import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ValidationError, FinancialRuleError } from '../utils/errors';
import { AccountingPeriod, ProfitDistribution, PartnerTransactionType } from '@zr-erp/shared';

export interface CreateAccountingPeriodInput {
  name: string;
  startDate: string;
  endDate: string;
}

export interface PeriodFinancialMetrics {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  grossProfit: number;
  netProfit: number;
  ordersCount: number;
  expensesCount: number;
}

export class AccountingPeriodService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public listPeriods(): (AccountingPeriod & { ordersCount?: number; expensesCount?: number })[] {
    const rows = this.db.prepare(`
      SELECT 
        id, name, start_date, end_date, is_closed, is_distributed,
        revenue, cogs, operating_expenses, gross_profit, net_profit,
        closed_at, distributed_at, created_at
      FROM accounting_periods
      ORDER BY start_date DESC
    `).all() as any[];

    return rows.map(r => {
      const isClosed = r.is_closed === 1;
      let revenue = Number(r.revenue);
      let cogs = Number(r.cogs);
      let operatingExpenses = Number(r.operating_expenses);
      let grossProfit = Number(r.gross_profit);
      let netProfit = Number(r.net_profit);
      let ordersCount = 0;
      let expensesCount = 0;

      // If period is currently OPEN, calculate live P&L metrics
      if (!isClosed) {
        const live = this.calculateMetrics(r.start_date, r.end_date);
        revenue = live.revenue;
        cogs = live.cogs;
        operatingExpenses = live.operatingExpenses;
        grossProfit = live.grossProfit;
        netProfit = live.netProfit;
        ordersCount = live.ordersCount;
        expensesCount = live.expensesCount;
      }

      return {
        id: r.id,
        name: r.name,
        startDate: r.start_date,
        endDate: r.end_date,
        isClosed,
        isDistributed: r.is_distributed === 1,
        revenue,
        cogs,
        operatingExpenses,
        grossProfit,
        netProfit,
        closedAt: r.closed_at,
        distributedAt: r.distributed_at,
        ordersCount,
        expensesCount,
      };
    });
  }

  public getPeriodById(id: string): AccountingPeriod & {
    distributions: ProfitDistribution[];
    ordersCount: number;
    expensesCount: number;
  } {
    const row = this.db.prepare(`
      SELECT 
        id, name, start_date, end_date, is_closed, is_distributed,
        revenue, cogs, operating_expenses, gross_profit, net_profit,
        closed_at, distributed_at, created_at
      FROM accounting_periods
      WHERE id = ?
    `).get(id) as any;

    if (!row) {
      throw new NotFoundError(`Période comptable introuvable: ${id}`);
    }

    const isClosed = row.is_closed === 1;
    let revenue = Number(row.revenue);
    let cogs = Number(row.cogs);
    let operatingExpenses = Number(row.operating_expenses);
    let grossProfit = Number(row.gross_profit);
    let netProfit = Number(row.net_profit);
    let ordersCount = 0;
    let expensesCount = 0;

    if (!isClosed) {
      const live = this.calculateMetrics(row.start_date, row.end_date);
      revenue = live.revenue;
      cogs = live.cogs;
      operatingExpenses = live.operatingExpenses;
      grossProfit = live.grossProfit;
      netProfit = live.netProfit;
      ordersCount = live.ordersCount;
      expensesCount = live.expensesCount;
    } else {
      const counts = this.getCounts(row.start_date, row.end_date);
      ordersCount = counts.ordersCount;
      expensesCount = counts.expensesCount;
    }

    // Fetch profit distributions if any
    const distRows = this.db.prepare(`
      SELECT 
        pd.id, pd.accounting_period_id, pd.partner_id, pd.ownership_percentage, pd.profit_share, pd.created_at,
        p.name as partner_name
      FROM profit_distributions pd
      JOIN partners p ON p.id = pd.partner_id
      WHERE pd.accounting_period_id = ?
      ORDER BY pd.ownership_percentage DESC
    `).all(id) as any[];

    return {
      id: row.id,
      name: row.name,
      startDate: row.start_date,
      endDate: row.end_date,
      isClosed,
      isDistributed: row.is_distributed === 1,
      revenue,
      cogs,
      operatingExpenses,
      grossProfit,
      netProfit,
      closedAt: row.closed_at,
      distributedAt: row.distributed_at,
      ordersCount,
      expensesCount,
      distributions: distRows.map(d => ({
        id: d.id,
        accountingPeriodId: d.accounting_period_id,
        partnerId: d.partner_id,
        partnerName: d.partner_name,
        ownershipPercentage: Number(d.ownership_percentage),
        profitShare: Number(d.profit_share),
        createdAt: d.created_at,
      })),
    };
  }

  public createPeriod(input: CreateAccountingPeriodInput, actorId?: string): AccountingPeriod {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Le nom de la période est obligatoire');
    }
    if (!input.startDate || !input.endDate) {
      throw new ValidationError('Les dates de début et de fin sont obligatoires');
    }
    if (input.startDate > input.endDate) {
      throw new ValidationError('La date de début ne peut pas être postérieure à la date de fin');
    }

    // Check for duplicate name
    const existing = this.db.prepare(`SELECT id FROM accounting_periods WHERE name = ?`).get(input.name.trim());
    if (existing) {
      throw new ValidationError(`Une période portant le nom "${input.name.trim()}" existe déjà`);
    }

    const id = `period-${input.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const live = this.calculateMetrics(input.startDate, input.endDate);

    this.db.prepare(`
      INSERT INTO accounting_periods (
        id, name, start_date, end_date, is_closed, is_distributed,
        revenue, cogs, operating_expenses, gross_profit, net_profit,
        created_at
      ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name.trim(),
      input.startDate,
      input.endDate,
      live.revenue,
      live.cogs,
      live.operatingExpenses,
      live.grossProfit,
      live.netProfit,
      now
    );

    this.logAudit({
      userId: actorId || null,
      action: 'CREATE',
      entityType: 'ACCOUNTING_PERIOD',
      entityId: id,
      newValue: JSON.stringify({ name: input.name, startDate: input.startDate, endDate: input.endDate }),
    });

    return this.getPeriodById(id);
  }

  public closePeriod(id: string, actorId?: string, actorName?: string): AccountingPeriod {
    const period = this.db.prepare(`SELECT * FROM accounting_periods WHERE id = ?`).get(id) as any;
    if (!period) {
      throw new NotFoundError(`Période comptable introuvable: ${id}`);
    }

    if (period.is_closed === 1) {
      throw new FinancialRuleError('Cette période comptable est déjà clôturée');
    }

    const metrics = this.calculateMetrics(period.start_date, period.end_date);
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE accounting_periods
      SET 
        is_closed = 1,
        closed_at = ?,
        revenue = ?,
        cogs = ?,
        operating_expenses = ?,
        gross_profit = ?,
        net_profit = ?
      WHERE id = ?
    `).run(
      now,
      metrics.revenue,
      metrics.cogs,
      metrics.operatingExpenses,
      metrics.grossProfit,
      metrics.netProfit,
      id
    );

    this.logAudit({
      userId: actorId || null,
      userName: actorName || null,
      action: 'CLOSE_PERIOD',
      entityType: 'ACCOUNTING_PERIOD',
      entityId: id,
      newValue: JSON.stringify({
        periodName: period.name,
        revenue: metrics.revenue,
        netProfit: metrics.netProfit,
        closedAt: now,
      }),
    });

    return this.getPeriodById(id);
  }

  public reopenPeriod(id: string, actorId?: string, actorName?: string): AccountingPeriod {
    const period = this.db.prepare(`SELECT * FROM accounting_periods WHERE id = ?`).get(id) as any;
    if (!period) {
      throw new NotFoundError(`Période comptable introuvable: ${id}`);
    }

    if (period.is_closed === 0) {
      throw new FinancialRuleError('Cette période comptable est déjà ouverte');
    }

    if (period.is_distributed === 1) {
      throw new FinancialRuleError('Impossible de rouvrir une période dont les bénéfices ont déjà été distribués aux associés.');
    }

    this.db.prepare(`
      UPDATE accounting_periods
      SET is_closed = 0, closed_at = NULL
      WHERE id = ?
    `).run(id);

    this.logAudit({
      userId: actorId || null,
      userName: actorName || null,
      action: 'REOPEN_PERIOD',
      entityType: 'ACCOUNTING_PERIOD',
      entityId: id,
      newValue: JSON.stringify({ periodName: period.name }),
    });

    return this.getPeriodById(id);
  }

  public distributeProfits(id: string, actorId?: string, actorName?: string): {
    period: AccountingPeriod;
    distributions: ProfitDistribution[];
  } {
    const period = this.db.prepare(`SELECT * FROM accounting_periods WHERE id = ?`).get(id) as any;
    if (!period) {
      throw new NotFoundError(`Période comptable introuvable: ${id}`);
    }

    if (period.is_closed === 0) {
      throw new FinancialRuleError('La période doit obligatoirement être clôturée avant de distribuer les bénéfices.');
    }

    if (period.is_distributed === 1) {
      throw new FinancialRuleError('Les bénéfices de cette période ont déjà été distribués.');
    }

    const netProfit = Number(period.net_profit);
    if (netProfit <= 0) {
      throw new FinancialRuleError(`Impossible de distribuer des bénéfices pour un résultat net nul ou déficitaire (${netProfit} DA).`);
    }

    // Fetch active partners
    const partners = this.db.prepare(`
      SELECT id, name, ownership_percentage
      FROM partners
      ORDER BY ownership_percentage ASC
    `).all() as any[];

    if (partners.length === 0) {
      throw new ValidationError('Aucun associé enregistré dans le système');
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const distributions: ProfitDistribution[] = [];

    const distributeTx = this.db.transaction(() => {
      for (const partner of partners) {
        const percentage = Number(partner.ownership_percentage);
        if (percentage <= 0) continue;
        const share = Math.round((netProfit * (percentage / 100)) * 100) / 100;
        if (share <= 0) continue;

        const distId = `pdist-${id}-${partner.id}`;
        const ptxId = `ptx-profit-${id}-${partner.id}`;

        // 1. Insert into profit_distributions
        this.db.prepare(`
          INSERT INTO profit_distributions (
            id, accounting_period_id, partner_id, ownership_percentage, profit_share, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(distId, id, partner.id, percentage, share, now);

        // 2. Post PROFIT_DISTRIBUTION to partner_transactions to credit partner equity
        this.db.prepare(`
          INSERT INTO partner_transactions (
            id, partner_id, type, amount, date, description, reference, accounting_period_id, created_by, created_at
          ) VALUES (?, ?, 'PROFIT_DISTRIBUTION', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          ptxId,
          partner.id,
          share,
          today,
          `Quote-part de bénéfice (${percentage}%) - Clôture Période ${period.name}`,
          `DIST-${period.name}`,
          id,
          actorId || null,
          now
        );

        distributions.push({
          id: distId,
          accountingPeriodId: id,
          partnerId: partner.id,
          partnerName: partner.name,
          ownershipPercentage: percentage,
          profitShare: share,
          createdAt: now,
        });
      }

      // 3. Update period status to DISTRIBUTED
      this.db.prepare(`
        UPDATE accounting_periods
        SET is_distributed = 1, distributed_at = ?
        WHERE id = ?
      `).run(now, id);

      // 4. Audit
      this.logAudit({
        userId: actorId || null,
        userName: actorName || null,
        action: 'DISTRIBUTE_PROFITS',
        entityType: 'ACCOUNTING_PERIOD',
        entityId: id,
        newValue: JSON.stringify({
          periodName: period.name,
          netProfit,
          distributions,
        }),
      });
    });

    distributeTx();

    return {
      period: this.getPeriodById(id),
      distributions,
    };
  }

  public calculateMetrics(startDate: string, endDate: string): PeriodFinancialMetrics {
    // 1. Orders Revenue & COGS (delivered or paid, excluding cancelled and returned)
    const ordersStat = this.db.prepare(`
      SELECT 
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(SUM(cost), 0) as total_cogs,
        COUNT(*) as orders_count
      FROM orders
      WHERE SUBSTR(created_at, 1, 10) >= ? AND SUBSTR(created_at, 1, 10) <= ?
        AND status NOT IN ('CANCELLED', 'RETURNED')
    `).get(startDate, endDate) as any;

    const revenue = Number(ordersStat?.total_revenue || 0);
    const cogs = Number(ordersStat?.total_cogs || 0);
    const ordersCount = Number(ordersStat?.orders_count || 0);

    // 2. Operating Expenses
    const expenseStat = this.db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_expenses,
        COUNT(*) as expenses_count
      FROM expenses
      WHERE date >= ? AND date <= ?
    `).get(startDate, endDate) as any;

    const operatingExpenses = Number(expenseStat?.total_expenses || 0);
    const expensesCount = Number(expenseStat?.expenses_count || 0);

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - operatingExpenses;

    return {
      revenue,
      cogs,
      operatingExpenses,
      grossProfit,
      netProfit,
      ordersCount,
      expensesCount,
    };
  }

  private getCounts(startDate: string, endDate: string): { ordersCount: number; expensesCount: number } {
    const orders = this.db.prepare(`
      SELECT COUNT(*) as c FROM orders
      WHERE SUBSTR(created_at, 1, 10) >= ? AND SUBSTR(created_at, 1, 10) <= ?
        AND status NOT IN ('CANCELLED', 'RETURNED')
    `).get(startDate, endDate) as any;

    const exp = this.db.prepare(`
      SELECT COUNT(*) as c FROM expenses
      WHERE date >= ? AND date <= ?
    `).get(startDate, endDate) as any;

    return {
      ordersCount: Number(orders?.c || 0),
      expensesCount: Number(exp?.c || 0),
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
