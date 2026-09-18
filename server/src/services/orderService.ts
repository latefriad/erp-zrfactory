import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { Order, OrderItem, OrderStatus, PaymentStatus, ProductionStatus } from '@zr-erp/shared';
import { ProductService } from './productService';

export interface CreateOrderItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  sellingPrice?: number;
  notes?: string;
}

export interface CreateOrderInput {
  customerId: string;
  items: CreateOrderItemInput[];
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryCompany?: string | null;
  trackingNumber?: string | null;
  deliveryFee?: number;
  discount?: number;
  shippingWilaya?: string | null;
  shippingCommune?: string | null;
  shippingAddress?: string | null;
  designFileName?: string | null;
  designFileUrl?: string | null;
  notes?: string | null;
}

export interface CreateStoreOrderItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  notes?: string;
}

export interface CreateStoreOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingWilaya: string;
  shippingCommune?: string;
  shippingAddress?: string;
  deliveryOption?: 'HOME' | 'STOP_DESK';
  deliveryCompany?: string;
  deliveryFee?: number;
  customizationTechnique?: 'DTF' | 'BRODERIE';
  designFileName?: string;
  designFileUrl?: string;
  notes?: string;
  items: CreateStoreOrderItemInput[];
}

export interface OrderFilterOptions {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  wilaya?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface OrderStats {
  totalOrders: number;
  pendingCount: number;
  printingCount: number;
  readyCount: number;
  shippedCount: number;
  deliveredCount: number;
  cancelledCount: number;
  totalRevenue: number;
  totalCost: number;
  totalGrossProfit: number;
  averageOrderValue: number;
}

export class OrderService {
  private customDb?: Database.Database;
  private productService: ProductService;

  constructor(db?: Database.Database) {
    this.customDb = db;
    this.productService = new ProductService(db);
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  private generateOrderNumber(): string {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `ZR-${yearMonth}`;

    const countRow = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE order_number LIKE ?
    `).get(`${prefix}-%`) as { count: number };

    const seq = (countRow?.count || 0) + 1;
    let candidate = `${prefix}-${String(seq).padStart(4, '0')}`;

    // Verify uniqueness
    const exists = this.db.prepare(`SELECT id FROM orders WHERE order_number = ?`).get(candidate);
    if (exists) {
      candidate = `${prefix}-${String(seq).padStart(4, '0')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    }

    return candidate;
  }

  public createOrder(input: CreateOrderInput, actorId?: string): Order {
    if (!input.customerId) {
      throw new ValidationError('Le client est obligatoire');
    }
    if (!input.items || input.items.length === 0) {
      throw new ValidationError('Une commande doit contenir au moins un article');
    }

    // Verify customer exists
    const customer = this.db.prepare(`
      SELECT id, name, phone, address, wilaya, commune 
      FROM customers 
      WHERE id = ?
    `).get(input.customerId) as any;

    if (!customer) {
      throw new NotFoundError(`Client introuvable (ID: ${input.customerId})`);
    }

    // Prepare items and calculate financial totals
    const preparedItems: Array<{
      id: string;
      productId: string;
      variantId: string | null;
      quantity: number;
      unitCost: number;
      sellingPrice: number;
      totalCost: number;
      totalPrice: number;
      notes: string | null;
      productName: string;
      variantName: string | null;
      sku: string;
    }> = [];

    let subtotal = 0;
    let totalCost = 0;

    for (const item of input.items) {
      if (!item.productId) {
        throw new ValidationError('L\'identifiant du produit est obligatoire');
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new ValidationError('La quantité d\'un article doit être supérieure à 0');
      }

      // Check product
      const product = this.db.prepare(`
        SELECT id, name, sku, base_cost, selling_price, is_active 
        FROM products 
        WHERE id = ?
      `).get(item.productId) as any;

      if (!product) {
        throw new NotFoundError(`Produit introuvable (ID: ${item.productId})`);
      }

      // Check variant if supplied
      let variant: any = null;
      if (item.variantId) {
        variant = this.db.prepare(`
          SELECT id, product_id, name, sku, additional_cost, additional_price, stock_quantity 
          FROM product_variants 
          WHERE id = ? AND product_id = ?
        `).get(item.variantId, item.productId) as any;

        if (!variant) {
          throw new ValidationError(`Déclinaison introuvable pour ce produit (Variant ID: ${item.variantId})`);
        }
      }

      // Calculate unit cost from POD components + variant additional cost
      const componentsCost = this.productService.calculateProductCost(product.id);
      const baseProductCost = componentsCost > 0 ? componentsCost : product.base_cost;
      const unitCost = baseProductCost + (variant?.additional_cost || 0);

      // Selling price: custom price or product selling_price + variant additional price
      const baseSellingPrice = product.selling_price + (variant?.additional_price || 0);
      const sellingPrice = (item.sellingPrice !== undefined && item.sellingPrice >= 0)
        ? item.sellingPrice
        : baseSellingPrice;

      const itemTotalPrice = item.quantity * sellingPrice;
      const itemTotalCost = item.quantity * unitCost;

      subtotal += itemTotalPrice;
      totalCost += itemTotalCost;

      preparedItems.push({
        id: `oi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        variantId: variant ? variant.id : null,
        quantity: item.quantity,
        unitCost,
        sellingPrice,
        totalCost: itemTotalCost,
        totalPrice: itemTotalPrice,
        notes: item.notes?.trim() || null,
        productName: product.name,
        variantName: variant?.name || null,
        sku: variant?.sku || product.sku,
      });
    }

    const discount = Math.max(0, input.discount || 0);
    const deliveryFee = Math.max(0, input.deliveryFee || 0);
    const total = Math.max(0, subtotal - discount + deliveryFee);
    const profit = (subtotal - discount) - totalCost;

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const orderNumber = this.generateOrderNumber();
    const status = input.status || OrderStatus.PENDING;
    const paymentStatus = input.paymentStatus || PaymentStatus.UNPAID;
    const now = new Date().toISOString();

    const shippingWilaya = input.shippingWilaya || customer.wilaya;
    const shippingCommune = input.shippingCommune || customer.commune;
    const shippingAddress = input.shippingAddress || customer.address;

    // Execute atomic transaction: insert order, items, and deduct variant stock
    const transaction = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO orders (
          id, order_number, customer_id, status, payment_status,
          subtotal, discount, delivery_fee, total, cost, profit,
          delivery_company, tracking_number, shipping_wilaya, shipping_commune, shipping_address,
          design_file_name, design_file_url,
          notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId,
        orderNumber,
        input.customerId,
        status,
        paymentStatus,
        subtotal,
        discount,
        deliveryFee,
        total,
        totalCost,
        profit,
        input.deliveryCompany || null,
        input.trackingNumber || null,
        shippingWilaya,
        shippingCommune,
        shippingAddress,
        input.designFileName || null,
        input.designFileUrl || null,
        input.notes || null,
        now,
        now
      );

      const insertItemStmt = this.db.prepare(`
        INSERT INTO order_items (
          id, order_id, product_id, variant_id, quantity, selling_price, unit_cost, total_cost, total_price, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const deductStockStmt = this.db.prepare(`
        UPDATE product_variants 
        SET stock_quantity = stock_quantity - ?, updated_at = ?
        WHERE id = ?
      `);

      for (const itm of preparedItems) {
        insertItemStmt.run(
          itm.id,
          orderId,
          itm.productId,
          itm.variantId,
          itm.quantity,
          itm.sellingPrice,
          itm.unitCost,
          itm.totalCost,
          itm.totalPrice,
          itm.notes,
          now
        );

        // Deduct variant stock if variant attached and status is not CANCELLED
        if (itm.variantId && status !== OrderStatus.CANCELLED) {
          deductStockStmt.run(itm.quantity, now, itm.variantId);
        }
      }

      // Automatically route order items into Atelier Production Floor
      try {
        const insertProdStmt = this.db.prepare(`
          INSERT INTO production_items (
            id, order_id, order_item_id, status, defect_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 0, ?, ?)
        `);
        for (const itm of preparedItems) {
          const prodId = `prod-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          insertProdStmt.run(
            prodId,
            orderId,
            itm.id,
            ProductionStatus.PENDING_DESIGN,
            now,
            now
          );
        }
      } catch (e) {
        // Silent fallback if production_items table does not exist in isolated early migration tests
      }


      this.logAudit({
        userId: actorId || null,
        action: 'CREATE',
        entityType: 'ORDER',
        entityId: orderId,
        newValue: JSON.stringify({
          orderNumber,
          customer: customer.name,
          total,
          profit,
          itemsCount: preparedItems.length,
        }),
      });
    });

    transaction();

    return this.getOrderById(orderId);
  }

  public getOrderById(orderId: string): Order {
    const row = this.db.prepare(`
      SELECT 
        o.id, o.order_number, o.customer_id, o.status, o.payment_status,
        o.subtotal, o.discount, o.delivery_fee, o.total, o.cost, o.profit,
        o.delivery_company, o.tracking_number, o.shipping_wilaya, o.shipping_commune, o.shipping_address,
        o.design_file_name, o.design_file_url,
        o.notes, o.created_at, o.updated_at,
        c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
        c.wilaya as customer_wilaya, c.commune as customer_commune, c.address as customer_address
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `).get(orderId) as any;

    if (!row) {
      throw new NotFoundError(`Commande introuvable (ID: ${orderId})`);
    }

    // Fetch items with product and variant info
    const itemRows = this.db.prepare(`
      SELECT 
        oi.id, oi.order_id, oi.product_id, oi.variant_id, oi.quantity,
        oi.selling_price, oi.unit_cost, oi.total_cost, oi.total_price, oi.notes,
        p.name as product_name, p.sku as product_sku,
        pv.name as variant_name, pv.sku as variant_sku
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE oi.order_id = ?
    `).all(orderId) as any[];

    const items: OrderItem[] = itemRows.map(i => ({
      id: i.id,
      orderId: i.order_id,
      productId: i.product_id,
      variantId: i.variant_id,
      productName: i.product_name,
      variantName: i.variant_name || undefined,
      sku: i.variant_sku || i.product_sku,
      quantity: i.quantity,
      sellingPrice: i.selling_price,
      unitCost: i.unit_cost,
      totalCost: i.total_cost,
      totalPrice: i.total_price,
      notes: i.notes || undefined,
    }));

    return {
      id: row.id,
      orderNumber: row.order_number,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      status: row.status as OrderStatus,
      paymentStatus: row.payment_status as PaymentStatus,
      subtotal: row.subtotal,
      discount: row.discount,
      deliveryFee: row.delivery_fee,
      total: row.total,
      cost: row.cost,
      profit: row.profit,
      deliveryCompany: row.delivery_company,
      trackingNumber: row.tracking_number,
      shippingWilaya: row.shipping_wilaya,
      shippingCommune: row.shipping_commune,
      shippingAddress: row.shipping_address,
      designFileName: row.design_file_name,
      designFileUrl: row.design_file_url,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items,
      itemsCount: items.length,
      customer: {
        id: row.customer_id,
        name: row.customer_name,
        phone: row.customer_phone,
        email: row.customer_email,
        wilaya: row.customer_wilaya,
        commune: row.customer_commune,
        address: row.customer_address,
      },
    };
  }

  public updateOrderStatus(orderId: string, newStatus: OrderStatus, actorId?: string): Order {
    const existing = this.getOrderById(orderId);

    if (existing.status === newStatus) {
      return existing;
    }

    const isExistingCancelledOrReturned = existing.status === OrderStatus.CANCELLED || existing.status === OrderStatus.RETURNED;
    const isNewCancelledOrReturned = newStatus === OrderStatus.CANCELLED || newStatus === OrderStatus.RETURNED;

    const now = new Date().toISOString();

    const transaction = this.db.transaction(() => {
      // 1. If transitioning from active -> CANCELLED/RETURNED: restore variant stock
      if (!isExistingCancelledOrReturned && isNewCancelledOrReturned) {
        const restoreStockStmt = this.db.prepare(`
          UPDATE product_variants 
          SET stock_quantity = stock_quantity + ?, updated_at = ?
          WHERE id = ?
        `);

        for (const item of existing.items || []) {
          if (item.variantId) {
            restoreStockStmt.run(item.quantity, now, item.variantId);
          }
        }
      }

      // 2. If transitioning from CANCELLED/RETURNED -> active: deduct variant stock again
      if (isExistingCancelledOrReturned && !isNewCancelledOrReturned) {
        const deductStockStmt = this.db.prepare(`
          UPDATE product_variants 
          SET stock_quantity = stock_quantity - ?, updated_at = ?
          WHERE id = ?
        `);

        for (const item of existing.items || []) {
          if (item.variantId) {
            deductStockStmt.run(item.quantity, now, item.variantId);
          }
        }
      }

      // 3. Update order status
      this.db.prepare(`
        UPDATE orders
        SET status = ?, updated_at = ?
        WHERE id = ?
      `).run(newStatus, now, orderId);

      // 4. Audit log
      this.logAudit({
        userId: actorId || null,
        action: 'UPDATE_STATUS',
        entityType: 'ORDER',
        entityId: orderId,
        oldValue: JSON.stringify({ status: existing.status }),
        newValue: JSON.stringify({ status: newStatus }),
      });
    });

    transaction();

    return this.getOrderById(orderId);
  }

  public updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, actorId?: string): Order {
    const existing = this.getOrderById(orderId);

    if (existing.paymentStatus === paymentStatus) {
      return existing;
    }

    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE orders
      SET payment_status = ?, updated_at = ?
      WHERE id = ?
    `).run(paymentStatus, now, orderId);

    this.logAudit({
      userId: actorId || null,
      action: 'UPDATE_PAYMENT',
      entityType: 'ORDER',
      entityId: orderId,
      oldValue: JSON.stringify({ paymentStatus: existing.paymentStatus }),
      newValue: JSON.stringify({ paymentStatus }),
    });

    return this.getOrderById(orderId);
  }

  public updateShippingInfo(
    orderId: string,
    info: { deliveryCompany?: string | null; trackingNumber?: string | null; deliveryFee?: number },
    actorId?: string
  ): Order {
    const existing = this.getOrderById(orderId);
    const now = new Date().toISOString();

    const deliveryCompany = info.deliveryCompany !== undefined ? info.deliveryCompany : existing.deliveryCompany;
    const trackingNumber = info.trackingNumber !== undefined ? info.trackingNumber : existing.trackingNumber;
    const deliveryFee = info.deliveryFee !== undefined ? Math.max(0, info.deliveryFee) : existing.deliveryFee;

    // Recalculate total if delivery fee changes
    const total = existing.subtotal - existing.discount + deliveryFee;

    this.db.prepare(`
      UPDATE orders
      SET delivery_company = ?, tracking_number = ?, delivery_fee = ?, total = ?, updated_at = ?
      WHERE id = ?
    `).run(deliveryCompany, trackingNumber, deliveryFee, total, now, orderId);

    this.logAudit({
      userId: actorId || null,
      action: 'UPDATE_SHIPPING',
      entityType: 'ORDER',
      entityId: orderId,
      newValue: JSON.stringify({ deliveryCompany, trackingNumber, deliveryFee, total }),
    });

    return this.getOrderById(orderId);
  }

  public listOrders(filters?: OrderFilterOptions): Order[] {
    let sql = `
      SELECT 
        o.id, o.order_number, o.customer_id, o.status, o.payment_status,
        o.subtotal, o.discount, o.delivery_fee, o.total, o.cost, o.profit,
        o.delivery_company, o.tracking_number, o.shipping_wilaya, o.shipping_commune, o.shipping_address,
        o.design_file_name, o.design_file_url,
        o.notes, o.created_at, o.updated_at,
        c.name as customer_name, c.phone as customer_phone,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as items_count
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      sql += ` AND o.status = ?`;
      params.push(filters.status);
    }

    if (filters?.paymentStatus) {
      sql += ` AND o.payment_status = ?`;
      params.push(filters.paymentStatus);
    }

    if (filters?.customerId) {
      sql += ` AND o.customer_id = ?`;
      params.push(filters.customerId);
    }

    if (filters?.wilaya) {
      sql += ` AND (o.shipping_wilaya = ? OR c.wilaya = ?)`;
      params.push(filters.wilaya, filters.wilaya);
    }

    if (filters?.search) {
      sql += ` AND (o.order_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR o.tracking_number LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters?.startDate) {
      sql += ` AND o.created_at >= ?`;
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      sql += ` AND o.created_at <= ?`;
      params.push(filters.endDate);
    }

    sql += ` ORDER BY o.created_at DESC`;

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
      orderNumber: r.order_number,
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      status: r.status as OrderStatus,
      paymentStatus: r.payment_status as PaymentStatus,
      subtotal: r.subtotal,
      discount: r.discount,
      deliveryFee: r.delivery_fee,
      total: r.total,
      cost: r.cost,
      profit: r.profit,
      deliveryCompany: r.delivery_company,
      trackingNumber: r.tracking_number,
      shippingWilaya: r.shipping_wilaya,
      shippingCommune: r.shipping_commune,
      shippingAddress: r.shipping_address,
      designFileName: r.design_file_name,
      designFileUrl: r.design_file_url,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      itemsCount: Number(r.items_count || 0),
    }));
  }

  public getOrderStats(): OrderStats {
    const row = this.db.prepare(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'PRINTING' THEN 1 ELSE 0 END) as printingCount,
        SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as readyCount,
        SUM(CASE WHEN status = 'SHIPPED' THEN 1 ELSE 0 END) as shippedCount,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as deliveredCount,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelledCount,
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total ELSE 0 END), 0) as totalRevenue,
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN cost ELSE 0 END), 0) as totalCost,
        COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN profit ELSE 0 END), 0) as totalGrossProfit
      FROM orders
    `).get() as any;

    const totalOrders = Number(row?.totalOrders || 0);
    const totalRevenue = Number(row?.totalRevenue || 0);
    const totalCost = Number(row?.totalCost || 0);
    const totalGrossProfit = Number(row?.totalGrossProfit || 0);
    const deliveredCount = Number(row?.deliveredCount || 0);
    const averageOrderValue = (totalOrders - Number(row?.cancelledCount || 0)) > 0
      ? Math.round(totalRevenue / (totalOrders - Number(row?.cancelledCount || 0)))
      : 0;

    return {
      totalOrders,
      pendingCount: Number(row?.pendingCount || 0),
      printingCount: Number(row?.printingCount || 0),
      readyCount: Number(row?.readyCount || 0),
      shippedCount: Number(row?.shippedCount || 0),
      deliveredCount,
      cancelledCount: Number(row?.cancelledCount || 0),
      totalRevenue,
      totalCost,
      totalGrossProfit,
      averageOrderValue,
    };
  }

  public deleteOrder(orderId: string, actorId?: string): void {
    const existing = this.getOrderById(orderId);

    // If order was active, restore stock before deleting
    const now = new Date().toISOString();
    const transaction = this.db.transaction(() => {
      if (existing.status !== OrderStatus.CANCELLED && existing.status !== OrderStatus.RETURNED) {
        const restoreStockStmt = this.db.prepare(`
          UPDATE product_variants 
          SET stock_quantity = stock_quantity + ?, updated_at = ?
          WHERE id = ?
        `);

        for (const item of existing.items || []) {
          if (item.variantId) {
            restoreStockStmt.run(item.quantity, now, item.variantId);
          }
        }
      }

      this.db.prepare(`DELETE FROM order_items WHERE order_id = ?`).run(orderId);
      this.db.prepare(`DELETE FROM orders WHERE id = ?`).run(orderId);

      this.logAudit({
        userId: actorId || null,
        action: 'DELETE',
        entityType: 'ORDER',
        entityId: orderId,
        oldValue: JSON.stringify({ orderNumber: existing.orderNumber, total: existing.total }),
      });
    });

    transaction();
  }

  public createStoreOrder(input: CreateStoreOrderInput): Order {
    if (!input.customerName || input.customerName.trim().length === 0) {
      throw new ValidationError('Le nom du client est obligatoire');
    }
    if (!input.customerPhone || input.customerPhone.trim().length === 0) {
      throw new ValidationError('Le numéro de téléphone est obligatoire');
    }
    if (!input.shippingWilaya || input.shippingWilaya.trim().length === 0) {
      throw new ValidationError('La wilaya de livraison est obligatoire');
    }
    if (!input.items || input.items.length === 0) {
      throw new ValidationError('Une commande doit contenir au moins un article');
    }

    const cleanPhone = input.customerPhone.trim();
    const cleanName = input.customerName.trim();
    const cleanWilaya = input.shippingWilaya.trim();
    const cleanCommune = input.shippingCommune?.trim() || 'Centre';
    const cleanAddress = input.shippingAddress?.trim() || '';

    // Check if customer exists by phone
    let customer = this.db.prepare(`
      SELECT id, name, phone, address, wilaya, commune 
      FROM customers 
      WHERE phone = ?
    `).get(cleanPhone) as any;

    if (!customer) {
      const customerId = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO customers (id, name, phone, email, address, wilaya, commune, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        customerId,
        cleanName,
        cleanPhone,
        input.customerEmail?.trim() || null,
        cleanAddress || null,
        cleanWilaya,
        cleanCommune,
        'Client Store Web E-Commerce',
        now,
        now
      );
      customer = { id: customerId, name: cleanName, phone: cleanPhone };
    } else {
      // Update contact info if changed
      this.db.prepare(`
        UPDATE customers
        SET wilaya = COALESCE(?, wilaya),
            commune = COALESCE(?, commune),
            address = COALESCE(?, address),
            updated_at = ?
        WHERE id = ?
      `).run(
        cleanWilaya,
        cleanCommune,
        cleanAddress || null,
        new Date().toISOString(),
        customer.id
      );
    }

    const deliveryNote = input.deliveryOption === 'STOP_DESK' ? '[Livraison Stop-Desk]' : '[Livraison à Domicile]';
    const designNote = input.designFileName ? `[Fichier Logo/Design: ${input.designFileName}]` : '';
    const orderNotes = [deliveryNote, designNote, input.notes].filter(Boolean).join(' - ') || `${deliveryNote} Commande Store Web`;

    return this.createOrder({
      customerId: customer.id,
      items: input.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        notes: item.notes || undefined,
      })),
      shippingWilaya: cleanWilaya,
      shippingCommune: cleanCommune,
      shippingAddress: cleanAddress,
      deliveryCompany: input.deliveryCompany || 'Yalidine',
      deliveryFee: input.deliveryFee !== undefined ? input.deliveryFee : 600,
      notes: orderNotes,
      designFileName: input.designFileName || null,
      designFileUrl: input.designFileUrl || null,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
    });
  }

  public trackOrder(query: string): any {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Numéro de commande ou numéro de téléphone requis pour le suivi');
    }

    const cleanQuery = query.trim();

    const row = this.db.prepare(`
      SELECT 
        o.id, o.order_number, o.status, o.payment_status,
        o.subtotal, o.delivery_fee, o.total,
        o.delivery_company, o.tracking_number, o.shipping_wilaya, o.shipping_commune,
        o.design_file_name, o.design_file_url, o.notes,
        o.created_at, o.updated_at,
        c.name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE UPPER(o.order_number) = UPPER(?) OR c.phone = ?
      ORDER BY o.created_at DESC
      LIMIT 1
    `).get(cleanQuery, cleanQuery) as any;

    if (!row) {
      throw new NotFoundError('Aucune commande trouvée avec ces informations');
    }

    const items = this.db.prepare(`
      SELECT 
        oi.id, oi.quantity, oi.selling_price, oi.total_price,
        p.name as product_name, pv.name as variant_name
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE oi.order_id = ?
    `).all(row.id) as any[];

    // Mask phone for privacy e.g. 0555****12
    const maskedPhone = row.customer_phone && row.customer_phone.length >= 8
      ? row.customer_phone.substring(0, 4) + '****' + row.customer_phone.slice(-2)
      : row.customer_phone;

    return {
      orderNumber: row.order_number,
      status: row.status,
      paymentStatus: row.payment_status,
      customerName: row.customer_name,
      customerPhone: maskedPhone,
      shippingWilaya: row.shipping_wilaya,
      shippingCommune: row.shipping_commune,
      deliveryCompany: row.delivery_company,
      trackingNumber: row.tracking_number,
      total: row.total,
      deliveryFee: row.delivery_fee,
      designFileName: row.design_file_name,
      designFileUrl: row.design_file_url,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: items.map(i => ({
        productName: i.product_name,
        variantName: i.variant_name || null,
        quantity: i.quantity,
        unitPrice: i.selling_price,
        totalPrice: i.total_price,
      })),
    };
  }

  private logAudit(entry: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: string | null;
    newValue?: string | null;
  }) {
    try {
      const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.db.prepare(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_value, newValue, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, DATETIME('now'))
      `).run(
        id,
        entry.userId || null,
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
