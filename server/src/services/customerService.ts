import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { Customer, CustomerProfile } from '@zr-erp/shared';

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  wilaya: string;
  commune: string;
  notes?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  wilaya?: string;
  commune?: string;
  notes?: string | null;
}

export interface CustomerListItem extends Customer {
  totalOrders: number;
  deliveredOrders: number;
  totalSpent: number;
  lastOrderDate?: string | null;
}

export class CustomerService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public createCustomer(input: CreateCustomerInput, actorId?: string): Customer {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Le nom du client est obligatoire');
    }
    if (!input.phone || input.phone.trim().length === 0) {
      throw new ValidationError('Le numéro de téléphone est obligatoire');
    }
    if (!input.wilaya) {
      throw new ValidationError('La wilaya est obligatoire');
    }

    const cleanPhone = input.phone.trim();

    // Check duplicate phone
    const existing = this.db.prepare(`SELECT id FROM customers WHERE phone = ?`).get(cleanPhone);
    if (existing) {
      throw new ConflictError(`Un client avec le numéro de téléphone ${cleanPhone} existe déjà.`);
    }

    const id = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO customers (id, name, phone, email, address, wilaya, commune, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name.trim(),
      cleanPhone,
      input.email?.trim() || null,
      input.address?.trim() || null,
      input.wilaya.trim(),
      input.commune?.trim() || '',
      input.notes?.trim() || null,
      now,
      now
    );

    // Audit log
    this.logAudit({
      userId: actorId || null,
      action: 'CREATE',
      entityType: 'CUSTOMER',
      entityId: id,
      newValue: JSON.stringify({ name: input.name, phone: cleanPhone, wilaya: input.wilaya }),
    });

    return this.getCustomerById(id);
  }

  public getCustomerById(id: string): Customer {
    const row = this.db.prepare(`
      SELECT id, name, phone, email, address, wilaya, commune, notes, created_at, updated_at
      FROM customers
      WHERE id = ?
    `).get(id) as any;

    if (!row) {
      throw new NotFoundError(`Client introuvable (ID: ${id})`);
    }

    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      wilaya: row.wilaya,
      commune: row.commune,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public getCustomerProfile(id: string): CustomerProfile & { recentOrders: any[] } {
    const customer = this.getCustomerById(id);

    // Aggregate statistics across orders
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as deliveredOrders,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelledOrders,
        SUM(CASE WHEN status = 'RETURNED' THEN 1 ELSE 0 END) as returnedOrders,
        COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN total ELSE 0 END), 0) as totalSpent,
        MAX(created_at) as lastOrderDate
      FROM orders
      WHERE customer_id = ?
    `).get(id) as any;

    const totalOrders = stats?.totalOrders || 0;
    const deliveredOrders = stats?.deliveredOrders || 0;
    const cancelledOrders = stats?.cancelledOrders || 0;
    const returnedOrders = stats?.returnedOrders || 0;
    const totalSpent = Number(stats?.totalSpent || 0);
    const lastOrderDate = stats?.lastOrderDate || null;
    const customerLifetimeValue = totalSpent;

    // Get order history
    const recentOrders = this.db.prepare(`
      SELECT id, order_number, status, payment_status, total, cost, profit, delivery_fee, created_at
      FROM orders
      WHERE customer_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(id) as any[];

    return {
      ...customer,
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      totalSpent,
      lastOrderDate,
      customerLifetimeValue,
      recentOrders: recentOrders.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        paymentStatus: o.payment_status,
        total: o.total,
        cost: o.cost,
        profit: o.profit,
        deliveryFee: o.delivery_fee,
        createdAt: o.created_at,
      })),
    };
  }

  public listCustomers(query?: { search?: string; wilaya?: string; limit?: number; offset?: number }): CustomerListItem[] {
    let sql = `
      SELECT 
        c.id, c.name, c.phone, c.email, c.address, c.wilaya, c.commune, c.notes, c.created_at, c.updated_at,
        COUNT(o.id) as total_orders,
        SUM(CASE WHEN o.status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered_orders,
        COALESCE(SUM(CASE WHEN o.status = 'DELIVERED' THEN o.total ELSE 0 END), 0) as total_spent,
        MAX(o.created_at) as last_order_date
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query?.wilaya) {
      sql += ` AND c.wilaya = ?`;
      params.push(query.wilaya);
    }

    if (query?.search) {
      sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.commune LIKE ? OR c.wilaya LIKE ?)`;
      params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
    }

    sql += ` GROUP BY c.id ORDER BY c.created_at DESC`;

    if (query?.limit) {
      sql += ` LIMIT ?`;
      params.push(query.limit);
      if (query?.offset) {
        sql += ` OFFSET ?`;
        params.push(query.offset);
      }
    }

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      address: r.address,
      wilaya: r.wilaya,
      commune: r.commune,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      totalOrders: Number(r.total_orders || 0),
      deliveredOrders: Number(r.delivered_orders || 0),
      totalSpent: Number(r.total_spent || 0),
      lastOrderDate: r.last_order_date || null,
    }));
  }

  public updateCustomer(id: string, input: UpdateCustomerInput, actorId?: string): Customer {
    const existing = this.getCustomerById(id);

    if (input.phone && input.phone.trim() !== existing.phone) {
      const cleanPhone = input.phone.trim();
      const duplicate = this.db.prepare(`SELECT id FROM customers WHERE phone = ? AND id != ?`).get(cleanPhone, id);
      if (duplicate) {
        throw new ConflictError(`Le numéro de téléphone ${cleanPhone} est déjà utilisé par un autre client.`);
      }
    }

    const now = new Date().toISOString();
    const updated = {
      name: input.name !== undefined ? input.name.trim() : existing.name,
      phone: input.phone !== undefined ? input.phone.trim() : existing.phone,
      email: input.email !== undefined ? input.email?.trim() || null : existing.email,
      address: input.address !== undefined ? input.address?.trim() || null : existing.address,
      wilaya: input.wilaya !== undefined ? input.wilaya.trim() : existing.wilaya,
      commune: input.commune !== undefined ? input.commune.trim() : existing.commune,
      notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
    };

    this.db.prepare(`
      UPDATE customers
      SET name = ?, phone = ?, email = ?, address = ?, wilaya = ?, commune = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.phone,
      updated.email,
      updated.address,
      updated.wilaya,
      updated.commune,
      updated.notes,
      now,
      id
    );

    this.logAudit({
      userId: actorId || null,
      action: 'UPDATE',
      entityType: 'CUSTOMER',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return this.getCustomerById(id);
  }

  public deleteCustomer(id: string, actorId?: string): void {
    const existing = this.getCustomerById(id);

    const ordersCount = this.db.prepare(`SELECT COUNT(*) as count FROM orders WHERE customer_id = ?`).get(id) as { count: number };
    if (ordersCount && ordersCount.count > 0) {
      throw new ConflictError(`Impossible de supprimer le client ${existing.name} car il possède ${ordersCount.count} commande(s) liée(s).`);
    }

    this.db.prepare(`DELETE FROM customers WHERE id = ?`).run(id);

    this.logAudit({
      userId: actorId || null,
      action: 'DELETE',
      entityType: 'CUSTOMER',
      entityId: id,
      oldValue: JSON.stringify(existing),
    });
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
      // Audit log failures should not fail operations
    }
  }
}
