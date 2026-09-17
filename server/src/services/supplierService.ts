import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { Supplier } from '@zr-erp/shared';

export interface CreateSupplierInput {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierInput {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export class SupplierService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public createSupplier(input: CreateSupplierInput, actorId?: string): Supplier {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Le nom du fournisseur est obligatoire');
    }
    if (!input.phone || input.phone.trim().length === 0) {
      throw new ValidationError('Le numéro de téléphone est obligatoire');
    }

    const cleanName = input.name.trim();
    const cleanPhone = input.phone.trim();

    const id = `supp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO suppliers (id, name, phone, email, address, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cleanName,
      cleanPhone,
      input.email?.trim() || null,
      input.address?.trim() || null,
      input.notes?.trim() || null,
      now,
      now
    );

    this.logAudit({
      userId: actorId || null,
      action: 'CREATE',
      entityType: 'SUPPLIER',
      entityId: id,
      newValue: JSON.stringify({ name: cleanName, phone: cleanPhone }),
    });

    return this.getSupplierById(id);
  }

  public getSupplierById(id: string): Supplier {
    const row = this.db.prepare(`
      SELECT 
        s.id, s.name, s.phone, s.email, s.address, s.notes, s.created_at, s.updated_at,
        COUNT(e.id) as purchases_count,
        COALESCE(SUM(e.amount), 0) as total_purchased
      FROM suppliers s
      LEFT JOIN expenses e ON e.supplier_id = s.id
      WHERE s.id = ?
      GROUP BY s.id
    `).get(id) as any;

    if (!row) {
      throw new NotFoundError(`Fournisseur introuvable (ID: ${id})`);
    }

    const totalPurchased = Number(row.total_purchased || 0);

    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      notes: row.notes,
      purchasesCount: Number(row.purchases_count || 0),
      totalPurchased,
      amountPaid: totalPurchased, // Fully paid expenses recorded
      amountOwed: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public getSupplierProfile(id: string): Supplier & { recentExpenses: any[] } {
    const supplier = this.getSupplierById(id);

    const expenses = this.db.prepare(`
      SELECT 
        e.id, e.amount, e.payment_method, e.date, e.description, e.created_at,
        c.name as category_name
      FROM expenses e
      JOIN expense_categories c ON c.id = e.category_id
      WHERE e.supplier_id = ?
      ORDER BY e.date DESC, e.created_at DESC
      LIMIT 20
    `).all(id) as any[];

    return {
      ...supplier,
      recentExpenses: expenses.map(e => ({
        id: e.id,
        amount: Number(e.amount),
        paymentMethod: e.payment_method,
        date: e.date,
        description: e.description,
        categoryName: e.category_name,
        createdAt: e.created_at,
      })),
    };
  }

  public listSuppliers(query?: { search?: string }): Supplier[] {
    let sql = `
      SELECT 
        s.id, s.name, s.phone, s.email, s.address, s.notes, s.created_at, s.updated_at,
        COUNT(e.id) as purchases_count,
        COALESCE(SUM(e.amount), 0) as total_purchased
      FROM suppliers s
      LEFT JOIN expenses e ON e.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query?.search) {
      sql += ` AND (s.name LIKE ? OR s.phone LIKE ? OR s.address LIKE ?)`;
      params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
    }

    sql += ` GROUP BY s.id ORDER BY s.name ASC`;

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(r => {
      const totalPurchased = Number(r.total_purchased || 0);
      return {
        id: r.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        address: r.address,
        notes: r.notes,
        purchasesCount: Number(r.purchases_count || 0),
        totalPurchased,
        amountPaid: totalPurchased,
        amountOwed: 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  }

  public updateSupplier(id: string, input: UpdateSupplierInput, actorId?: string): Supplier {
    const existing = this.getSupplierById(id);
    const now = new Date().toISOString();

    const updated = {
      name: input.name !== undefined ? input.name.trim() : existing.name,
      phone: input.phone !== undefined ? input.phone.trim() : existing.phone,
      email: input.email !== undefined ? input.email?.trim() || null : existing.email,
      address: input.address !== undefined ? input.address?.trim() || null : existing.address,
      notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
    };

    this.db.prepare(`
      UPDATE suppliers
      SET name = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.phone,
      updated.email,
      updated.address,
      updated.notes,
      now,
      id
    );

    this.logAudit({
      userId: actorId || null,
      action: 'UPDATE',
      entityType: 'SUPPLIER',
      entityId: id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    return this.getSupplierById(id);
  }

  public deleteSupplier(id: string, actorId?: string): void {
    const existing = this.getSupplierById(id);

    const expenseCount = this.db.prepare(`SELECT COUNT(*) as count FROM expenses WHERE supplier_id = ?`).get(id) as { count: number };
    if (expenseCount && expenseCount.count > 0) {
      throw new ConflictError(`Impossible de supprimer le fournisseur "${existing.name}" car ${expenseCount.count} dépense(s) lui sont associées.`);
    }

    this.db.prepare(`DELETE FROM suppliers WHERE id = ?`).run(id);

    this.logAudit({
      userId: actorId || null,
      action: 'DELETE',
      entityType: 'SUPPLIER',
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
      // Ignore audit failure
    }
  }
}
