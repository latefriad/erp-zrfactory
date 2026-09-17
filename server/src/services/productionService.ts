import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { ProductionItem, ProductionStatus, ProductionMetrics, OrderStatus } from '@zr-erp/shared';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface ProductionFilterOptions {
  status?: string;
  search?: string;
  operatorId?: string;
  wilaya?: string;
}

export class ProductionService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public listQueue(filters?: ProductionFilterOptions): ProductionItem[] {
    let sql = `
      SELECT 
        pi.id,
        pi.order_id,
        pi.order_item_id,
        pi.status,
        pi.assigned_operator_id,
        u.name as assigned_operator_name,
        pi.operator_notes,
        pi.defect_count,
        pi.defect_reason,
        pi.started_at,
        pi.completed_at,
        pi.created_at,
        pi.updated_at,
        o.order_number,
        o.shipping_wilaya,
        c.name as customer_name,
        c.phone as customer_phone,
        p.name as product_name,
        pv.name as variant_name,
        oi.quantity,
        oi.notes as item_notes
      FROM production_items pi
      INNER JOIN orders o ON pi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      INNER JOIN order_items oi ON pi.order_item_id = oi.id
      INNER JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN users u ON pi.assigned_operator_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.status && filters.status !== 'ALL') {
      sql += ` AND pi.status = ?`;
      params.push(filters.status);
    }

    if (filters?.operatorId) {
      sql += ` AND pi.assigned_operator_id = ?`;
      params.push(filters.operatorId);
    }

    if (filters?.wilaya) {
      sql += ` AND o.shipping_wilaya = ?`;
      params.push(filters.wilaya);
    }

    if (filters?.search) {
      const q = `%${filters.search}%`;
      sql += ` AND (o.order_number LIKE ? OR c.name LIKE ? OR p.name LIKE ? OR pi.operator_notes LIKE ?)`;
      params.push(q, q, q, q);
    }

    sql += ` ORDER BY 
      CASE pi.status
        WHEN 'PRINTING_DTF' THEN 1
        WHEN 'HEAT_PRESS' THEN 2
        WHEN 'QUALITY_CHECK' THEN 3
        WHEN 'READY_FOR_PRINT' THEN 4
        WHEN 'PENDING_DESIGN' THEN 5
        WHEN 'PACKED' THEN 6
        WHEN 'READY_FOR_SHIPPING' THEN 7
        ELSE 8
      END ASC,
      pi.created_at ASC
    `;

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map((r) => this.mapRowToProductionItem(r));
  }

  public getItemById(id: string): ProductionItem {
    const sql = `
      SELECT 
        pi.id,
        pi.order_id,
        pi.order_item_id,
        pi.status,
        pi.assigned_operator_id,
        u.name as assigned_operator_name,
        pi.operator_notes,
        pi.defect_count,
        pi.defect_reason,
        pi.started_at,
        pi.completed_at,
        pi.created_at,
        pi.updated_at,
        o.order_number,
        o.shipping_wilaya,
        c.name as customer_name,
        c.phone as customer_phone,
        p.name as product_name,
        pv.name as variant_name,
        oi.quantity,
        oi.notes as item_notes
      FROM production_items pi
      INNER JOIN orders o ON pi.order_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      INNER JOIN order_items oi ON pi.order_item_id = oi.id
      INNER JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN users u ON pi.assigned_operator_id = u.id
      WHERE pi.id = ?
    `;

    const row = this.db.prepare(sql).get(id) as any;
    if (!row) {
      throw new NotFoundError(`Article de production introuvable: ${id}`);
    }

    return this.mapRowToProductionItem(row);
  }

  public updateStatus(
    id: string,
    newStatus: ProductionStatus,
    actorId?: string,
    actorName?: string,
    notes?: string
  ): ProductionItem {
    const existing = this.getItemById(id);

    if (!Object.values(ProductionStatus).includes(newStatus)) {
      throw new ValidationError(`Statut de production invalide: ${newStatus}`);
    }

    const now = new Date().toISOString();
    let startedAt = existing.startedAt;
    let completedAt = existing.completedAt;

    if (newStatus === ProductionStatus.PRINTING_DTF && !startedAt) {
      startedAt = now;
    }

    if (
      (newStatus === ProductionStatus.PACKED || newStatus === ProductionStatus.READY_FOR_SHIPPING) &&
      !completedAt
    ) {
      completedAt = now;
    }

    const operatorId = actorId || existing.assignedOperatorId || null;
    const operatorNotes = notes !== undefined ? notes : existing.operatorNotes;

    this.db.prepare(`
      UPDATE production_items
      SET status = ?,
          assigned_operator_id = ?,
          operator_notes = ?,
          started_at = ?,
          completed_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      newStatus,
      operatorId,
      operatorNotes,
      startedAt,
      completedAt,
      now,
      id
    );

    this.logAudit({
      userId: actorId || null,
      userName: actorName || null,
      action: 'UPDATE_PRODUCTION_STATUS',
      entityType: 'PRODUCTION_ITEM',
      entityId: id,
      oldValue: existing.status,
      newValue: newStatus,
    });

    // Check parent order items status synchronization
    this.syncParentOrderStatus(existing.orderId, actorId, actorName);

    return this.getItemById(id);
  }

  public logDefect(
    id: string,
    defectReason: string,
    requiresReprint: boolean,
    actorId?: string,
    actorName?: string
  ): ProductionItem {
    const existing = this.getItemById(id);

    if (!defectReason || !defectReason.trim()) {
      throw new ValidationError('Le motif du défaut est obligatoire.');
    }

    const now = new Date().toISOString();
    const newStatus = requiresReprint ? ProductionStatus.READY_FOR_PRINT : existing.status;
    const newDefectCount = existing.defectCount + 1;

    this.db.prepare(`
      UPDATE production_items
      SET defect_count = ?,
          defect_reason = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `).run(newDefectCount, defectReason.trim(), newStatus, now, id);

    this.logAudit({
      userId: actorId || null,
      userName: actorName || null,
      action: 'PRODUCTION_DEFECT_REPORTED',
      entityType: 'PRODUCTION_ITEM',
      entityId: id,
      newValue: JSON.stringify({ defectReason, requiresReprint, newStatus }),
    });

    return this.getItemById(id);
  }

  public getMetrics(): ProductionMetrics {
    const counts = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status != 'READY_FOR_SHIPPING' THEN 1 ELSE 0 END) as total_active,
        SUM(CASE WHEN status = 'PRINTING_DTF' THEN 1 ELSE 0 END) as in_print,
        SUM(CASE WHEN status = 'HEAT_PRESS' THEN 1 ELSE 0 END) as in_press,
        SUM(CASE WHEN status = 'QUALITY_CHECK' THEN 1 ELSE 0 END) as in_qc,
        SUM(CASE WHEN status IN ('PACKED', 'READY_FOR_SHIPPING') AND DATE(completed_at) = DATE('now') THEN 1 ELSE 0 END) as completed_today,
        SUM(defect_count) as total_defects,
        SUM(CASE WHEN defect_count > 0 THEN 1 ELSE 0 END) as items_with_defects
      FROM production_items
    `).get() as any;

    const total = Number(counts?.total || 0);
    const totalActive = Number(counts?.total_active || 0);
    const inPrint = Number(counts?.in_print || 0);
    const inPress = Number(counts?.in_press || 0);
    const inQualityCheck = Number(counts?.in_qc || 0);
    const completedToday = Number(counts?.completed_today || 0);
    const totalDefects = Number(counts?.total_defects || 0);
    const itemsWithDefects = Number(counts?.items_with_defects || 0);

    const defectRate = total > 0 ? parseFloat(((itemsWithDefects / total) * 100).toFixed(1)) : 0;

    return {
      totalActive,
      inPrint,
      inPress,
      inQualityCheck,
      completedToday,
      defectRate,
      totalDefects,
    };
  }

  private syncParentOrderStatus(orderId: string, actorId?: string, actorName?: string) {
    try {
      const items = this.db.prepare(`
        SELECT status FROM production_items WHERE order_id = ?
      `).all(orderId) as any[];

      if (!items || items.length === 0) return;

      const allShippable = items.every(
        (i) => i.status === ProductionStatus.READY_FOR_SHIPPING || i.status === ProductionStatus.PACKED
      );

      const anyInProduction = items.some((i) =>
        [
          ProductionStatus.PRINTING_DTF,
          ProductionStatus.HEAT_PRESS,
          ProductionStatus.QUALITY_CHECK,
        ].includes(i.status as ProductionStatus)
      );

      const currentOrder = this.db.prepare(`SELECT status FROM orders WHERE id = ?`).get(orderId) as any;
      if (!currentOrder) return;

      let targetStatus: OrderStatus | null = null;

      if (allShippable && currentOrder.status !== OrderStatus.SHIPPED && currentOrder.status !== OrderStatus.DELIVERED) {
        targetStatus = OrderStatus.SHIPPED;
      } else if (
        anyInProduction &&
        currentOrder.status !== OrderStatus.PROCESSING &&
        currentOrder.status !== OrderStatus.PRINTING &&
        currentOrder.status !== OrderStatus.SHIPPED &&
        currentOrder.status !== OrderStatus.DELIVERED
      ) {
        targetStatus = OrderStatus.PROCESSING;
      }

      if (targetStatus && targetStatus !== currentOrder.status) {
        this.db.prepare(`
          UPDATE orders
          SET status = ?, updated_at = DATETIME('now')
          WHERE id = ?
        `).run(targetStatus, orderId);

        this.logAudit({
          userId: actorId || null,
          userName: actorName || null,
          action: 'AUTO_ORDER_STATUS_SYNC',
          entityType: 'ORDER',
          entityId: orderId,
          oldValue: currentOrder.status,
          newValue: targetStatus,
        });
      }
    } catch (err: any) {
      logger.warn(`Failed to sync parent order ${orderId} status: ${err.message}`);
    }
  }

  private mapRowToProductionItem(r: any): ProductionItem {
    // Detect DTF format from item notes or product defaults
    let dtfFormat = 'A3';
    if (r.item_notes) {
      const lower = r.item_notes.toLowerCase();
      if (lower.includes('a4')) dtfFormat = 'A4';
      else if (lower.includes('a3')) dtfFormat = 'A3';
      else if (lower.includes('cusson') || lower.includes('poitrine') || lower.includes('pocket')) dtfFormat = 'POCKET';
    } else if (r.product_name && r.product_name.toLowerCase().includes('casquette')) {
      dtfFormat = 'POCKET';
    }

    // Extract size and color
    let size = r.garment_size || undefined;
    let color = r.garment_color || undefined;

    if (!size && r.variant_name) {
      const parts = r.variant_name.split('/');
      if (parts.length >= 2) {
        color = parts[0].trim();
        size = parts[1].trim();
      }
    }

    return {
      id: r.id,
      orderId: r.order_id,
      orderItemId: r.order_item_id,
      orderNumber: r.order_number,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      wilayaName: r.shipping_wilaya,
      productName: r.product_name,
      variantName: r.variant_name,
      garmentColor: color,
      size: size,
      quantity: Number(r.quantity || 1),
      dtfFormat: dtfFormat,
      status: r.status as ProductionStatus,
      assignedOperatorId: r.assigned_operator_id,
      assignedOperatorName: r.assigned_operator_name,
      operatorNotes: r.operator_notes,
      defectCount: Number(r.defect_count || 0),
      defectReason: r.defect_reason,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
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
      // ignore
    }
  }
}
