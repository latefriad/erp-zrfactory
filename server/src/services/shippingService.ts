import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import {
  CarrierName,
  DeliveryType,
  ManifestStatus,
  ShippingManifest,
  ShippingOrderSummary,
  ShippingRateZone,
  ShippingMetrics,
  OrderStatus,
  PaymentStatus,
  CashTransactionType,
  AuditAction,
  AuditEntityType
} from '@zr-erp/shared';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface ShippingQueueFilters {
  search?: string;
  wilaya?: string;
  carrier?: string;
}

export interface ManifestListFilters {
  carrier?: string;
  status?: string;
  search?: string;
}

export interface CreateManifestInput {
  carrier: CarrierName | string;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  notes?: string;
  orderIds: string[];
}

export class ShippingService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  /**
   * Lists orders ready for shipping / parcel dispatch
   */
  public listShippingQueue(filters?: ShippingQueueFilters): ShippingOrderSummary[] {
    let sql = `
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.payment_status,
        o.subtotal,
        o.delivery_fee,
        o.total,
        o.delivery_company,
        o.delivery_type,
        o.tracking_number,
        o.shipping_wilaya,
        o.shipping_commune,
        o.shipping_address,
        o.dispatched_at,
        o.delivered_at,
        o.returned_at,
        o.return_reason,
        o.cod_remitted_at,
        o.created_at,
        c.name as customer_name,
        c.phone as customer_phone,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.shipping_manifest_id IS NULL
        AND o.status NOT IN ('SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED')
    `;

    const params: any[] = [];

    if (filters?.wilaya) {
      sql += ` AND o.shipping_wilaya LIKE ?`;
      params.push(`%${filters.wilaya}%`);
    }

    if (filters?.carrier) {
      sql += ` AND (o.delivery_company = ? OR o.delivery_company LIKE ?)`;
      params.push(filters.carrier, `%${filters.carrier}%`);
    }

    if (filters?.search) {
      sql += ` AND (
        o.id LIKE ? OR
        o.order_number LIKE ? OR 
        c.name LIKE ? OR 
        c.phone LIKE ? OR 
        o.shipping_wilaya LIKE ? OR 
        o.shipping_commune LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY o.created_at ASC`;

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map((r) => this.mapOrderRowToSummary(r));
  }

  /**
   * Creates a batch Shipping Manifest and atomically links selected orders
   */
  public createManifest(
    input: CreateManifestInput,
    actorId?: string,
    actorName?: string
  ): ShippingManifest {
    if (!input.orderIds || input.orderIds.length === 0) {
      throw new ValidationError('Veuillez sélectionner au moins une commande pour créer un bordereau d\'expédition.');
    }

    if (!input.carrier) {
      throw new ValidationError('Le transporteur est obligatoire.');
    }

    const now = new Date().toISOString();
    const manifestId = `man-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Generate unique Manifest Number MAN-YYYY-XXXX
    const year = new Date().getFullYear();
    const countRow = this.db.prepare(`
      SELECT COUNT(*) as c FROM shipping_manifests WHERE manifest_number LIKE ?
    `).get(`MAN-${year}-%`) as any;
    const nextSeq = (countRow?.c || 0) + 1;
    const manifestNumber = `MAN-${year}-${nextSeq.toString().padStart(4, '0')}`;

    let manifestTotalCOD = 0;
    const processedOrders: any[] = [];

    const tx = this.db.transaction(() => {
      // 1. Validate all orders exist and are eligible
      const checkOrderStmt = this.db.prepare(`
        SELECT id, order_number, total, delivery_company, tracking_number, shipping_manifest_id, status, shipping_wilaya
        FROM orders WHERE id = ?
      `);

      for (const orderId of input.orderIds) {
        const ord = checkOrderStmt.get(orderId) as any;
        if (!ord) {
          throw new NotFoundError(`Commande avec ID "${orderId}" introuvable.`);
        }
        if (ord.shipping_manifest_id) {
          throw new ValidationError(`La commande ${ord.order_number} est déjà rattachée à un bordereau d'expédition.`);
        }
        if (ord.status === OrderStatus.CANCELLED || ord.status === OrderStatus.RETURNED) {
          throw new ValidationError(`La commande ${ord.order_number} est annulée ou retournée et ne peut être expédiée.`);
        }

        manifestTotalCOD += Number(ord.total || 0);

        // Generate tracking number if not present
        let tracking = ord.tracking_number;
        if (!tracking) {
          const randDigits = Math.floor(10000 + Math.random() * 90000);
          const yy = String(year).slice(2);
          const mm = String(new Date().getMonth() + 1).padStart(2, '0');
          if (input.carrier === CarrierName.YALIDINE || input.carrier.toLowerCase().includes('yalidine')) {
            tracking = `yal-${yy}${mm}-${randDigits}`;
          } else if (input.carrier === CarrierName.ZR_DISPATCH || input.carrier.toLowerCase().includes('zr')) {
            tracking = `ZR-EXP-${randDigits}DZ`;
          } else {
            tracking = `${input.carrier.slice(0, 3).toUpperCase()}-${yy}${mm}-${randDigits}`;
          }
        }

        processedOrders.push({
          id: ord.id,
          trackingNumber: tracking,
        });
      }

      // 2. Insert Shipping Manifest record
      this.db.prepare(`
        INSERT INTO shipping_manifests (
          id, manifest_number, carrier, driver_name, driver_phone, vehicle_plate,
          total_parcels, total_cod_amount, status, notes, created_by, dispatched_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        manifestId,
        manifestNumber,
        input.carrier,
        input.driverName || null,
        input.driverPhone || null,
        input.vehiclePlate || null,
        input.orderIds.length,
        manifestTotalCOD,
        ManifestStatus.DISPATCHED,
        input.notes || null,
        actorId || null,
        now,
        now,
        now
      );

      // 3. Update orders to SHIPPED and link to manifest
      const updateOrderStmt = this.db.prepare(`
        UPDATE orders
        SET shipping_manifest_id = ?,
            delivery_company = ?,
            tracking_number = ?,
            status = 'SHIPPED',
            dispatched_at = ?,
            updated_at = ?
        WHERE id = ?
      `);

      for (const po of processedOrders) {
        updateOrderStmt.run(
          manifestId,
          input.carrier,
          po.trackingNumber,
          now,
          now,
          po.id
        );
      }

      // 4. Update corresponding production items to READY_FOR_SHIPPING if not already
      try {
        const updateProdStmt = this.db.prepare(`
          UPDATE production_items
          SET status = 'READY_FOR_SHIPPING', updated_at = ?
          WHERE order_id = ? AND status != 'READY_FOR_SHIPPING'
        `);
        for (const po of processedOrders) {
          updateProdStmt.run(now, po.id);
        }
      } catch {
        // Safe fallback
      }

      // 5. Audit Log
      this.logAudit({
        userId: actorId || null,
        userName: actorName || null,
        action: 'CREATE_SHIPPING_MANIFEST',
        entityType: 'SHIPPING_MANIFEST',
        entityId: manifestId,
        newValue: JSON.stringify({
          manifestNumber,
          carrier: input.carrier,
          totalParcels: input.orderIds.length,
          totalCodAmount: manifestTotalCOD,
          driverName: input.driverName,
        }),
      });
    });

    tx();

    logger.info(`Shipping manifest ${manifestNumber} created with ${input.orderIds.length} parcels (COD: ${manifestTotalCOD} DA)`);
    return this.getManifestById(manifestId);
  }

  /**
   * Lists all shipping manifests with optional filters
   */
  public listManifests(filters?: ManifestListFilters): ShippingManifest[] {
    let sql = `
      SELECT 
        sm.id,
        sm.manifest_number,
        sm.carrier,
        sm.driver_name,
        sm.driver_phone,
        sm.vehicle_plate,
        sm.total_parcels,
        sm.total_cod_amount,
        sm.status,
        sm.notes,
        sm.created_by,
        u.name as created_by_name,
        sm.dispatched_at,
        sm.completed_at,
        sm.created_at,
        sm.updated_at
      FROM shipping_manifests sm
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.carrier) {
      sql += ` AND (sm.carrier = ? OR sm.carrier LIKE ?)`;
      params.push(filters.carrier, `%${filters.carrier}%`);
    }

    if (filters?.status) {
      sql += ` AND sm.status = ?`;
      params.push(filters.status);
    }

    if (filters?.search) {
      sql += ` AND (
        sm.manifest_number LIKE ? OR 
        sm.driver_name LIKE ? OR 
        sm.driver_phone LIKE ? OR 
        sm.vehicle_plate LIKE ? OR 
        sm.notes LIKE ?
      )`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY sm.created_at DESC`;

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => this.mapManifestRow(r));
  }

  /**
   * Retrieves single manifest with all linked orders
   */
  public getManifestById(id: string): ShippingManifest {
    const row = this.db.prepare(`
      SELECT 
        sm.id,
        sm.manifest_number,
        sm.carrier,
        sm.driver_name,
        sm.driver_phone,
        sm.vehicle_plate,
        sm.total_parcels,
        sm.total_cod_amount,
        sm.status,
        sm.notes,
        sm.created_by,
        u.name as created_by_name,
        sm.dispatched_at,
        sm.completed_at,
        sm.created_at,
        sm.updated_at
      FROM shipping_manifests sm
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE sm.id = ?
    `).get(id) as any;

    if (!row) {
      throw new NotFoundError(`Bordereau d'expédition introuvable avec l'ID "${id}".`);
    }

    // Fetch linked orders
    const orderRows = this.db.prepare(`
      SELECT 
        o.id,
        o.order_number,
        o.status,
        o.payment_status,
        o.subtotal,
        o.delivery_fee,
        o.total,
        o.delivery_company,
        o.delivery_type,
        o.tracking_number,
        o.shipping_wilaya,
        o.shipping_commune,
        o.shipping_address,
        o.dispatched_at,
        o.delivered_at,
        o.returned_at,
        o.return_reason,
        o.cod_remitted_at,
        o.created_at,
        c.name as customer_name,
        c.phone as customer_phone,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as items_count
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.shipping_manifest_id = ?
      ORDER BY o.order_number ASC
    `).all(id) as any[];

    const manifest = this.mapManifestRow(row);
    manifest.orders = orderRows.map((r) => this.mapOrderRowToSummary(r));
    return manifest;
  }

  /**
   * Updates manifest status (DRAFT -> DISPATCHED -> COMPLETED / CANCELLED)
   */
  public updateManifestStatus(
    id: string,
    newStatus: ManifestStatus,
    actorId?: string,
    actorName?: string
  ): ShippingManifest {
    const existing = this.getManifestById(id);

    const now = new Date().toISOString();
    const completedAt = newStatus === ManifestStatus.COMPLETED ? now : existing.completedAt;

    this.db.prepare(`
      UPDATE shipping_manifests
      SET status = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, completedAt, now, id);

    this.logAudit({
      userId: actorId || null,
      userName: actorName || null,
      action: 'UPDATE_MANIFEST_STATUS',
      entityType: 'SHIPPING_MANIFEST',
      entityId: id,
      oldValue: JSON.stringify({ status: existing.status }),
      newValue: JSON.stringify({ status: newStatus }),
    });

    return this.getManifestById(id);
  }

  /**
   * Marks a shipped parcel as DELIVERED by carrier
   */
  public markOrderDelivered(
    orderId: string,
    actorId?: string,
    actorName?: string,
    notes?: string
  ): ShippingOrderSummary {
    const order = this.db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone 
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) {
      throw new NotFoundError(`Commande avec l'ID "${orderId}" introuvable.`);
    }

    const now = new Date().toISOString();
    const newNotes = notes ? `${order.notes ? order.notes + ' | ' : ''}${notes}` : order.notes;

    this.db.prepare(`
      UPDATE orders
      SET status = 'DELIVERED', delivered_at = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(now, newNotes, now, orderId);

    this.logAudit({
      userId: actorId || null,
      userName: actorName || null,
      action: 'DELIVER_ORDER',
      entityType: 'ORDER',
      entityId: orderId,
      oldValue: JSON.stringify({ status: order.status }),
      newValue: JSON.stringify({ status: 'DELIVERED', deliveredAt: now }),
    });

    const updated = this.db.prepare(`
      SELECT 
        o.id, o.order_number, o.status, o.payment_status, o.subtotal, o.delivery_fee, o.total,
        o.delivery_company, o.delivery_type, o.tracking_number, o.shipping_wilaya, o.shipping_commune,
        o.shipping_address, o.dispatched_at, o.delivered_at, o.returned_at, o.return_reason,
        o.cod_remitted_at, o.created_at, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(orderId) as any;

    return this.mapOrderRowToSummary(updated);
  }

  /**
   * Marks a parcel as RETURNED by carrier with optional stock restoration
   */
  public markOrderReturned(
    orderId: string,
    returnReason: string,
    restoreInventory: boolean = true,
    actorId?: string,
    actorName?: string
  ): ShippingOrderSummary {
    const order = this.db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone 
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!order) {
      throw new NotFoundError(`Commande avec l'ID "${orderId}" introuvable.`);
    }

    const now = new Date().toISOString();

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE orders
        SET status = 'RETURNED', returned_at = ?, return_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(now, returnReason, now, orderId);

      // Restore inventory if requested and order was previously active
      if (restoreInventory) {
        const items = this.db.prepare(`
          SELECT variant_id, quantity FROM order_items WHERE order_id = ?
        `).all(orderId) as any[];

        const restockStmt = this.db.prepare(`
          UPDATE product_variants 
          SET stock_quantity = stock_quantity + ?, updated_at = ?
          WHERE id = ?
        `);

        for (const itm of items) {
          if (itm.variant_id) {
            restockStmt.run(itm.quantity, now, itm.variant_id);
          }
        }
      }

      this.logAudit({
        userId: actorId || null,
        userName: actorName || null,
        action: 'RETURN_ORDER',
        entityType: 'ORDER',
        entityId: orderId,
        oldValue: JSON.stringify({ status: order.status }),
        newValue: JSON.stringify({ status: 'RETURNED', returnReason, restoreInventory }),
      });
    });

    tx();

    const updated = this.db.prepare(`
      SELECT 
        o.id, o.order_number, o.status, o.payment_status, o.subtotal, o.delivery_fee, o.total,
        o.delivery_company, o.delivery_type, o.tracking_number, o.shipping_wilaya, o.shipping_commune,
        o.shipping_address, o.dispatched_at, o.delivered_at, o.returned_at, o.return_reason,
        o.cod_remitted_at, o.created_at, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(orderId) as any;

    return this.mapOrderRowToSummary(updated);
  }

  /**
   * Settle & Remit Cash-on-Delivery (COD) funds from carrier into target Cash Account
   */
  public remitManifestCOD(
    manifestId: string,
    cashAccountId: string,
    actorId?: string,
    actorName?: string
  ): { manifestId: string; totalRemitted: number; ordersCount: number; newCashBalance: number } {
    const manifest = this.getManifestById(manifestId);

    // Target cash account
    const account = this.db.prepare(`
      SELECT id, name, balance FROM cash_accounts WHERE id = ?
    `).get(cashAccountId) as any;

    if (!account) {
      throw new NotFoundError(`Compte de trésorerie avec l'ID "${cashAccountId}" introuvable.`);
    }

    // Find delivered orders awaiting COD payment
    const deliveredOrders = this.db.prepare(`
      SELECT id, order_number, total 
      FROM orders 
      WHERE shipping_manifest_id = ? 
        AND status = 'DELIVERED' 
        AND payment_status != 'PAID'
    `).all(manifestId) as any[];

    if (deliveredOrders.length === 0) {
      throw new ValidationError('Aucune commande livrée en attente de paiement sur ce bordereau.');
    }

    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];
    const totalCOD = deliveredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const newBalance = Number(account.balance) + totalCOD;

    const tx = this.db.transaction(() => {
      // 1. Mark orders as PAID and set cod_remitted_at
      const updateOrderPaymentStmt = this.db.prepare(`
        UPDATE orders
        SET payment_status = 'PAID', cod_remitted_at = ?, updated_at = ?
        WHERE id = ?
      `);

      const insertPaymentStmt = this.db.prepare(`
        INSERT INTO payments (
          id, order_id, cash_account_id, amount, payment_method, reference, notes, date, created_by, created_at
        ) VALUES (?, ?, ?, ?, 'CASH', ?, ?, ?, ?, ?)
      `);

      for (const ord of deliveredOrders) {
        updateOrderPaymentStmt.run(now, now, ord.id);
        const pId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        insertPaymentStmt.run(
          pId,
          ord.id,
          cashAccountId,
          ord.total,
          manifest.manifestNumber,
          `Versement COD Transporteur (${manifest.carrier})`,
          todayDate,
          actorId || null,
          now
        );
      }

      // 2. Insert into cash_transactions
      const txId = `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO cash_transactions (
          id, cash_account_id, type, amount, balance_after, date, description, reference_id, created_at
        ) VALUES (?, ?, 'ORDER_PAYMENT', ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        cashAccountId,
        totalCOD,
        newBalance,
        todayDate,
        `Versement COD Transporteur (${manifest.carrier}) - Bordereau ${manifest.manifestNumber} (${deliveredOrders.length} colis)`,
        manifestId,
        now
      );

      // 3. Update cash account balance
      this.db.prepare(`
        UPDATE cash_accounts SET balance = ?, updated_at = ? WHERE id = ?
      `).run(newBalance, now, cashAccountId);

      // 4. Check if all orders in manifest are resolved (DELIVERED or RETURNED)
      const remainingActive = this.db.prepare(`
        SELECT COUNT(*) as c FROM orders 
        WHERE shipping_manifest_id = ? AND status NOT IN ('DELIVERED', 'RETURNED', 'CANCELLED')
      `).get(manifestId) as any;

      if ((remainingActive?.c || 0) === 0) {
        this.db.prepare(`
          UPDATE shipping_manifests 
          SET status = 'COMPLETED', completed_at = ?, updated_at = ? 
          WHERE id = ?
        `).run(now, now, manifestId);
      }

      // 5. Audit Log
      this.logAudit({
        userId: actorId || null,
        userName: actorName || null,
        action: 'REMIT_COD',
        entityType: 'SHIPPING_MANIFEST',
        entityId: manifestId,
        newValue: JSON.stringify({
          manifestNumber: manifest.manifestNumber,
          totalRemitted: totalCOD,
          ordersCount: deliveredOrders.length,
          targetAccount: account.name,
          newCashBalance: newBalance,
        }),
      });
    });

    tx();

    logger.info(`Remitted ${totalCOD} DA for manifest ${manifest.manifestNumber} to cash account ${account.name}`);
    return {
      manifestId,
      totalRemitted: totalCOD,
      ordersCount: deliveredOrders.length,
      newCashBalance: newBalance,
    };
  }

  /**
   * Retrieves 58 Wilayas shipping delivery rates
   */
  public getShippingRates(): ShippingRateZone[] {
    const rows = this.db.prepare(`
      SELECT id, wilaya_code, wilaya_name, zone_number, fee_domicile, fee_stop_desk, is_active, updated_at
      FROM shipping_rates
      ORDER BY wilaya_code ASC
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      wilayaCode: Number(r.wilaya_code),
      wilayaName: r.wilaya_name,
      zoneNumber: Number(r.zone_number),
      feeDomicile: Number(r.fee_domicile),
      feeStopDesk: Number(r.fee_stop_desk),
      isActive: Boolean(r.is_active),
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Updates rates for a specific Algerian Wilaya
   */
  public updateShippingRate(
    wilayaCode: number,
    input: { feeDomicile?: number; feeStopDesk?: number; isActive?: boolean },
    actorId?: string,
    actorName?: string
  ): ShippingRateZone {
    const existing = this.db.prepare(`
      SELECT * FROM shipping_rates WHERE wilaya_code = ?
    `).get(wilayaCode) as any;

    if (!existing) {
      throw new NotFoundError(`Wilaya avec le code "${wilayaCode}" introuvable dans la grille.`);
    }

    const now = new Date().toISOString();
    const feeDom = input.feeDomicile !== undefined ? input.feeDomicile : existing.fee_domicile;
    const feeDesk = input.feeStopDesk !== undefined ? input.feeStopDesk : existing.fee_stop_desk;
    const active = input.isActive !== undefined ? (input.isActive ? 1 : 0) : existing.is_active;

    this.db.prepare(`
      UPDATE shipping_rates
      SET fee_domicile = ?, fee_stop_desk = ?, is_active = ?, updated_at = ?
      WHERE wilaya_code = ?
    `).run(feeDom, feeDesk, active, now, wilayaCode);

    this.logAudit({
      userId: actorId || null,
      userName: actorName || null,
      action: 'UPDATE_SHIPPING_RATE',
      entityType: 'SHIPPING_RATE',
      entityId: `rate-w-${wilayaCode}`,
      oldValue: JSON.stringify({
        feeDomicile: existing.fee_domicile,
        feeStopDesk: existing.fee_stop_desk,
      }),
      newValue: JSON.stringify({
        feeDomicile: feeDom,
        feeStopDesk: feeDesk,
      }),
    });

    const updated = this.db.prepare(`
      SELECT id, wilaya_code, wilaya_name, zone_number, fee_domicile, fee_stop_desk, is_active, updated_at
      FROM shipping_rates WHERE wilaya_code = ?
    `).get(wilayaCode) as any;

    return {
      id: updated.id,
      wilayaCode: Number(updated.wilaya_code),
      wilayaName: updated.wilaya_name,
      zoneNumber: Number(updated.zone_number),
      feeDomicile: Number(updated.fee_domicile),
      feeStopDesk: Number(updated.fee_stop_desk),
      isActive: Boolean(updated.is_active),
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Retrieves high-level shipping and logistics KPIs
   */
  public getShippingMetrics(): ShippingMetrics {
    const inTransitRow = this.db.prepare(`
      SELECT COUNT(*) as c FROM orders WHERE status = 'SHIPPED'
    `).get() as any;

    const deliveredRow = this.db.prepare(`
      SELECT COUNT(*) as c FROM orders WHERE status = 'DELIVERED'
    `).get() as any;

    const returnedRow = this.db.prepare(`
      SELECT COUNT(*) as c FROM orders WHERE status = 'RETURNED'
    `).get() as any;

    const pendingCodRow = this.db.prepare(`
      SELECT COALESCE(SUM(total), 0) as s FROM orders 
      WHERE (status = 'SHIPPED' OR (status = 'DELIVERED' AND payment_status != 'PAID'))
    `).get() as any;

    const remittedCodRow = this.db.prepare(`
      SELECT COALESCE(SUM(total), 0) as s FROM orders 
      WHERE payment_status = 'PAID' AND shipping_manifest_id IS NOT NULL
    `).get() as any;

    const activeManifestsRow = this.db.prepare(`
      SELECT COUNT(*) as c FROM shipping_manifests WHERE status IN ('DRAFT', 'DISPATCHED')
    `).get() as any;

    const deliveredCount = deliveredRow?.c || 0;
    const returnedCount = returnedRow?.c || 0;
    const resolvedTotal = deliveredCount + returnedCount;

    const deliverySuccessRate = resolvedTotal > 0 ? (deliveredCount / resolvedTotal) * 100 : 100;
    const returnRate = resolvedTotal > 0 ? (returnedCount / resolvedTotal) * 100 : 0;

    return {
      inTransitCount: inTransitRow?.c || 0,
      deliveredCount,
      returnedCount,
      pendingCodAmount: Number(pendingCodRow?.s || 0),
      remittedCodAmount: Number(remittedCodRow?.s || 0),
      deliverySuccessRate: Number(deliverySuccessRate.toFixed(1)),
      returnRate: Number(returnRate.toFixed(1)),
      activeManifestsCount: activeManifestsRow?.c || 0,
    };
  }

  /**
   * Helper: Map row to ShippingOrderSummary
   */
  private mapOrderRowToSummary(r: any): ShippingOrderSummary {
    return {
      id: r.id,
      orderNumber: r.order_number,
      customerName: r.customer_name || 'Client Inconnu',
      customerPhone: r.customer_phone || '',
      shippingWilaya: r.shipping_wilaya || '',
      shippingCommune: r.shipping_commune || '',
      shippingAddress: r.shipping_address || null,
      deliveryType: r.delivery_type || DeliveryType.DOMICILE,
      trackingNumber: r.tracking_number || null,
      deliveryCompany: r.delivery_company || null,
      total: Number(r.total || 0),
      status: r.status,
      paymentStatus: r.payment_status,
      itemsCount: r.items_count !== undefined ? Number(r.items_count) : undefined,
      dispatchedAt: r.dispatched_at || null,
      deliveredAt: r.delivered_at || null,
      returnedAt: r.returned_at || null,
      returnReason: r.return_reason || null,
      codRemittedAt: r.cod_remitted_at || null,
      createdAt: r.created_at,
    };
  }

  /**
   * Helper: Map row to ShippingManifest
   */
  private mapManifestRow(r: any): ShippingManifest {
    return {
      id: r.id,
      manifestNumber: r.manifest_number,
      carrier: r.carrier,
      driverName: r.driver_name || null,
      driverPhone: r.driver_phone || null,
      vehiclePlate: r.vehicle_plate || null,
      totalParcels: Number(r.total_parcels || 0),
      totalCodAmount: Number(r.total_cod_amount || 0),
      status: r.status,
      notes: r.notes || null,
      createdBy: r.created_by || null,
      createdByName: r.created_by_name || null,
      dispatchedAt: r.dispatched_at || null,
      completedAt: r.completed_at || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Helper: Record audit trail
   */
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

export const shippingService = new ShippingService();
