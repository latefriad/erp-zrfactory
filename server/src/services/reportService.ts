import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { IncomeStatement, BalanceSheet, ProductMarginReport } from '@zr-erp/shared';
import { PartnerService } from './partnerService';

export class ReportService {
  private customDb?: Database.Database;
  private partnerService: PartnerService;

  constructor(db?: Database.Database) {
    this.customDb = db;
    this.partnerService = new PartnerService(db);
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public getIncomeStatement(startDate?: string, endDate?: string): IncomeStatement {
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || `${today.substring(0, 7)}-01`;
    const end = endDate || today;

    // 1. Orders Revenue, Total COGS and Orders Count
    const orderSummary = this.db.prepare(`
      SELECT 
        COALESCE(SUM(total), 0) as revenue,
        COALESCE(SUM(cost), 0) as total_cogs,
        COUNT(*) as orders_count
      FROM orders
      WHERE SUBSTR(created_at, 1, 10) >= ? AND SUBSTR(created_at, 1, 10) <= ?
        AND status NOT IN ('CANCELLED', 'RETURNED')
    `).get(start, end) as any;

    const revenue = Number(orderSummary?.revenue || 0);
    const totalCogs = Number(orderSummary?.total_cogs || 0);
    const ordersCount = Number(orderSummary?.orders_count || 0);
    const averageOrderValue = ordersCount > 0 ? Math.round((revenue / ordersCount) * 100) / 100 : 0;

    // 2. Itemized Cost Components (Garments / DTF / Packaging)
    const costBreakdownRows = this.db.prepare(`
      SELECT 
        pcc.type as component_type,
        COALESCE(SUM(pcc.cost * oi.quantity), 0) as component_total
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN product_cost_components pcc ON pcc.product_id = oi.product_id
      WHERE SUBSTR(o.created_at, 1, 10) >= ? AND SUBSTR(o.created_at, 1, 10) <= ?
        AND o.status NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY pcc.type
    `).all(start, end) as any[];

    let baseGarments = 0;
    let printingDtf = 0;
    let packaging = 0;
    let otherDirect = 0;

    for (const r of costBreakdownRows) {
      const amount = Number(r.component_total);
      if (r.component_type === 'BASE_ITEM') baseGarments += amount;
      else if (r.component_type === 'PRINTING') printingDtf += amount;
      else if (r.component_type === 'PACKAGING') packaging += amount;
      else otherDirect += amount;
    }

    // Fallback: If no components were explicitly linked, assign totalCogs to garments
    if (baseGarments === 0 && printingDtf === 0 && packaging === 0 && totalCogs > 0) {
      baseGarments = totalCogs;
    }

    const cogsSum = baseGarments + printingDtf + packaging + otherDirect;
    const finalCogsTotal = cogsSum > 0 ? cogsSum : totalCogs;

    const grossProfit = revenue - finalCogsTotal;
    const grossMarginPercentage = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;

    // 3. Operating Expenses by Category
    const expenseRows = this.db.prepare(`
      SELECT 
        ec.id as category_id,
        ec.name as category_name,
        COALESCE(SUM(e.amount), 0) as amount
      FROM expense_categories ec
      JOIN expenses e ON e.category_id = ec.id
      WHERE e.date >= ? AND e.date <= ?
      GROUP BY ec.id, ec.name
      HAVING amount > 0
      ORDER BY amount DESC
    `).all(start, end) as any[];

    const expensesCount = (this.db.prepare(`
      SELECT COUNT(*) as c FROM expenses WHERE date >= ? AND date <= ?
    `).get(start, end) as any)?.c || 0;

    const totalExpenses = expenseRows.reduce((sum, r) => sum + Number(r.amount), 0);

    const expensesByCategory = expenseRows.map(r => {
      const amount = Number(r.amount);
      const percentage = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 1000) / 10 : 0;
      return {
        categoryId: r.category_id,
        categoryName: r.category_name,
        amount,
        percentage,
      };
    });

    const netProfit = grossProfit - totalExpenses;
    const netMarginPercentage = revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0;

    return {
      period: {
        startDate: start,
        endDate: end,
      },
      revenue,
      cogs: {
        total: finalCogsTotal,
        baseGarments,
        printingDtf,
        packaging,
        otherDirect,
      },
      grossProfit,
      grossMarginPercentage,
      operatingExpenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
      },
      netProfit,
      netMarginPercentage,
      metrics: {
        ordersCount,
        averageOrderValue,
        expensesCount: Number(expensesCount),
      },
    };
  }

  public getBalanceSheet(asOfDate?: string): BalanceSheet {
    const today = new Date().toISOString().split('T')[0];
    const targetDate = asOfDate || today;

    // 1. Assets - Cash Accounts
    const cashRows = this.db.prepare(`
      SELECT id, name, type, balance
      FROM cash_accounts
      ORDER BY is_default DESC, name ASC
    `).all() as any[];

    const cashAccounts = cashRows.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      balance: Number(c.balance),
    }));

    const totalCash = cashAccounts.reduce((sum, a) => sum + a.balance, 0);

    // 2. Assets - Inventory Valuation (Raw materials stock quantity * unit cost)
    const inventoryValRow = this.db.prepare(`
      SELECT COALESCE(SUM(stock_quantity * unit_cost), 0) as val
      FROM materials
    `).get() as any;

    const inventoryValuation = Number(inventoryValRow?.val || 0);

    // 3. Assets - Customer Receivables (Unpaid or partially paid orders)
    const receivablesRow = this.db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total_unpaid
      FROM orders
      WHERE status NOT IN ('CANCELLED', 'RETURNED')
        AND payment_status IN ('UNPAID', 'PARTIAL')
        AND SUBSTR(created_at, 1, 10) <= ?
    `).get(targetDate) as any;

    const customerReceivables = Number(receivablesRow?.total_unpaid || 0);
    const totalAssets = totalCash + inventoryValuation + customerReceivables;

    // 4. Liabilities & Equity - Partner Capital Accounts
    const partners = this.partnerService.listPartners();
    const partnerBalances = partners.map(p => ({
      id: p.id,
      name: p.name,
      ownershipPercentage: p.ownershipPercentage,
      balance: p.currentBalance,
    }));

    const totalPartnerEquity = partnerBalances.reduce((sum, p) => sum + p.balance, 0);

    // 5. Current Net Profit
    const yearStart = `${targetDate.substring(0, 4)}-01-01`;
    const ytdPnl = this.getIncomeStatement(yearStart, targetDate);
    const currentPeriodNetProfit = ytdPnl.netProfit;

    const supplierPayables = 0; // Cash accounting basis
    const totalLiabilitiesAndEquity = totalPartnerEquity;

    return {
      asOfDate: targetDate,
      assets: {
        cashAccounts,
        totalCash,
        inventoryValuation,
        customerReceivables,
        totalAssets,
      },
      liabilitiesAndEquity: {
        partnerBalances,
        totalPartnerEquity,
        currentPeriodNetProfit,
        supplierPayables,
        totalLiabilitiesAndEquity,
      },
    };
  }

  public getProductMarginAnalysis(startDate?: string, endDate?: string): ProductMarginReport[] {
    const today = new Date().toISOString().split('T')[0];
    const start = startDate || `${today.substring(0, 7)}-01`;
    const end = endDate || today;

    const rows = this.db.prepare(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        COALESCE(SUM(oi.quantity), 0) as units_sold,
        COALESCE(SUM(oi.total_price), 0) as revenue,
        COALESCE(SUM(oi.total_cost), 0) as cogs
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE SUBSTR(o.created_at, 1, 10) >= ? AND SUBSTR(o.created_at, 1, 10) <= ?
        AND o.status NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY p.id, p.name, p.sku
      ORDER BY revenue DESC
    `).all(start, end) as any[];

    return rows.map(r => {
      const unitsSold = Number(r.units_sold);
      const revenue = Number(r.revenue);
      const cogs = Number(r.cogs);
      const grossProfit = revenue - cogs;
      const marginPercentage = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;

      return {
        productId: r.product_id,
        productName: r.product_name,
        sku: r.sku,
        unitsSold,
        revenue,
        cogs,
        grossProfit,
        marginPercentage,
      };
    });
  }
}
