import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import {
  DashboardSummary,
  DashboardFinancials,
  DashboardPartnerSummary,
  DashboardOrdersSummary,
  DashboardProductionSummary,
  DashboardShippingSummary,
  DashboardInventoryAlerts,
  DashboardRecentActivity,
  UserRole
} from '@zr-erp/shared';
import { PartnerService } from './partnerService';


export class DashboardService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public getSummary(userRole?: string): DashboardSummary {
    const isEmployee = userRole === UserRole.EMPLOYEE;

    // 1. Financials (Hidden/Zeroed for Employee per strict RBAC)
    let financials: DashboardFinancials = {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      expenses: 0,
      netProfit: 0,
      cashBalance: 0,
      currency: 'DZD',
    };

    if (!isEmployee) {
      const orderRow = this.db.prepare(`
        SELECT 
          COALESCE(SUM(total), 0) as revenue,
          COALESCE(SUM(cost), 0) as cogs
        FROM orders
        WHERE status NOT IN ('CANCELLED', 'RETURNED')
      `).get() as any;

      const revenue = Number(orderRow?.revenue || 0);
      const cogs = Number(orderRow?.cogs || 0);
      const grossProfit = revenue - cogs;

      const expenseRow = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      `).get() as any;
      const expenses = Number(expenseRow?.total || 0);
      const netProfit = grossProfit - expenses;

      const cashRow = this.db.prepare(`
        SELECT COALESCE(SUM(balance), 0) as total FROM cash_accounts
      `).get() as any;
      const cashBalance = Number(cashRow?.total || 0);

      financials = {
        revenue,
        cogs,
        grossProfit,
        expenses,
        netProfit,
        cashBalance,
        currency: 'DZD',
      };
    }

    // 2. Partners Summary (Hidden for Employee)
    let partners: DashboardPartnerSummary[] = [];
    if (!isEmployee) {
      const partnerService = new PartnerService(this.db);
      const partnerList = partnerService.listPartners();

      partners = partnerList.map(p => ({
        id: p.id,
        name: p.name,
        ownershipPercentage: Number(p.ownershipPercentage),
        initialCapital: Number(p.initialCapital),
        currentBalance: Number(p.currentBalance),
      }));
    }


    // 3. Orders Pipeline Counters
    const orderStatusRows = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
    `).all() as any[];

    const statusMap: Record<string, number> = {};
    let totalOrders = 0;
    for (const r of orderStatusRows) {
      statusMap[r.status] = Number(r.count);
      totalOrders += Number(r.count);
    }

    const orders: DashboardOrdersSummary = {
      total: totalOrders,
      pending: statusMap['PENDING'] || 0,
      confirmed: statusMap['CONFIRMED'] || 0,
      processing: statusMap['PROCESSING'] || 0,
      printing: statusMap['PRINTED'] || 0,
      ready: statusMap['READY'] || 0,
      shipped: statusMap['SHIPPED'] || 0,
      delivered: statusMap['DELIVERED'] || 0,
      cancelled: statusMap['CANCELLED'] || 0,
      returned: statusMap['RETURNED'] || 0,
    };

    // 4. Atelier Production Metrics
    const prodRows = this.db.prepare(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN status NOT IN ('READY_FOR_SHIPPING') THEN 1 ELSE 0 END) as active_items,
        SUM(CASE WHEN status = 'PRINTING_DTF' THEN 1 ELSE 0 END) as printing_count,
        SUM(CASE WHEN status = 'HEAT_PRESS' THEN 1 ELSE 0 END) as press_count,
        SUM(CASE WHEN status IN ('PACKED', 'READY_FOR_SHIPPING') THEN 1 ELSE 0 END) as packed_count,
        SUM(CASE WHEN defect_count > 0 THEN 1 ELSE 0 END) as defect_items,
        SUM(CASE WHEN status = 'READY_FOR_SHIPPING' THEN 1 ELSE 0 END) as throughput
      FROM production_items
    `).get() as any;

    const totalProdItems = Number(prodRows?.total_items || 0);
    const defectItems = Number(prodRows?.defect_items || 0);

    const production: DashboardProductionSummary = {
      activeItems: Number(prodRows?.active_items || 0),
      printingCount: Number(prodRows?.printing_count || 0),
      pressCount: Number(prodRows?.press_count || 0),
      packedCount: Number(prodRows?.packed_count || 0),
      defectRate: totalProdItems > 0 ? Math.round((defectItems / totalProdItems) * 1000) / 10 : 0,
      totalThroughput: Number(prodRows?.throughput || 0),
    };

    // 5. Shipping Logistics Metrics
    const readyToShipRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders 
      WHERE status IN ('READY', 'READY_FOR_SHIPPING') AND shipping_manifest_id IS NULL
    `).get() as any;

    const inTransitRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'SHIPPED'
    `).get() as any;

    const deliveredRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'DELIVERED'
    `).get() as any;

    const returnedRow = this.db.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'RETURNED'
    `).get() as any;

    const pendingCodRow = this.db.prepare(`
      SELECT COALESCE(SUM(total), 0) as total FROM orders 
      WHERE status = 'DELIVERED' AND cod_remitted_at IS NULL
    `).get() as any;

    const deliveredCount = Number(deliveredRow?.count || 0);
    const returnedCount = Number(returnedRow?.count || 0);
    const resolvedShipments = deliveredCount + returnedCount;

    const shipping: DashboardShippingSummary = {
      readyToShip: Number(readyToShipRow?.count || 0),
      inTransit: Number(inTransitRow?.count || 0),
      delivered: deliveredCount,
      returned: returnedCount,
      returnRate: resolvedShipments > 0 ? Math.round((returnedCount / resolvedShipments) * 1000) / 10 : 0,
      pendingCodAmount: Number(pendingCodRow?.total || 0),
    };

    // 6. Inventory Alerts (Low stock products and raw materials)
    const lowVariantRows = this.db.prepare(`
      SELECT 
        pv.id,
        p.name || ' (' || pv.name || ')' as name,
        pv.stock_quantity as current_stock,
        5 as min_stock
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.stock_quantity <= 5
      LIMIT 5
    `).all() as any[];

    const lowMaterialRows = this.db.prepare(`
      SELECT 
        id,
        name,
        stock_quantity as current_stock,
        reorder_point as min_stock,
        unit
      FROM materials
      WHERE stock_quantity <= reorder_point
      LIMIT 5
    `).all() as any[];

    const inventoryAlerts: DashboardInventoryAlerts = {
      lowStockProductsCount: lowVariantRows.length,
      lowStockMaterialsCount: lowMaterialRows.length,
      items: [
        ...lowVariantRows.map(r => ({
          id: r.id,
          name: r.name,
          type: 'PRODUCT' as const,
          currentStock: Number(r.current_stock),
          minimumStock: Number(r.min_stock),
          unit: 'pcs',
        })),
        ...lowMaterialRows.map(r => ({
          id: r.id,
          name: r.name,
          type: 'MATERIAL' as const,
          currentStock: Number(r.current_stock),
          minimumStock: Number(r.min_stock),
          unit: r.unit,
        })),
      ],
    };

    // 7. Recent Operational Activity Feed
    const activityRows = this.db.prepare(`
      SELECT 
        id,
        user_id as userId,
        user_name as userName,
        action,
        entity_type as entityType,
        entity_id as targetId,
        timestamp as createdAt
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT 6
    `).all() as any[];

    const recentActivity: DashboardRecentActivity[] = activityRows.map(r => ({
      id: r.id,
      userId: r.userId || '',
      userName: r.userName || 'Système',
      action: r.action,
      entityType: r.entityType,
      targetId: r.targetId || undefined,
      createdAt: r.createdAt,
    }));


    return {
      financials,
      partners,
      orders,
      production,
      shipping,
      inventoryAlerts,
      recentActivity,
    };
  }
}
