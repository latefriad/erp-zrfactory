import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ValidationError } from '../utils/errors';
import { Material } from '@zr-erp/shared';

export interface MaterialDetail extends Material {
  isLowStock: boolean;
}

export class MaterialService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public listMaterials(query?: { search?: string; lowStockOnly?: boolean }): MaterialDetail[] {
    let sql = `
      SELECT id, name, unit, unit_cost, stock_quantity, reorder_point, supplier_id, created_at, updated_at
      FROM materials
      WHERE 1=1
    `;
    const params: any[] = [];

    if (query?.search) {
      sql += ` AND name LIKE ?`;
      params.push(`%${query.search}%`);
    }

    if (query?.lowStockOnly) {
      sql += ` AND stock_quantity <= reorder_point`;
    }

    sql += ` ORDER BY name ASC`;

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      unit: r.unit,
      unitCost: r.unit_cost,
      stockQuantity: r.stock_quantity,
      reorderPoint: r.reorder_point,
      supplierId: r.supplier_id,
      isLowStock: r.stock_quantity <= r.reorder_point,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  public getMaterialById(id: string): MaterialDetail {
    const r = this.db.prepare(`
      SELECT id, name, unit, unit_cost, stock_quantity, reorder_point, supplier_id, created_at, updated_at
      FROM materials
      WHERE id = ?
    `).get(id) as any;

    if (!r) {
      throw new NotFoundError(`Matière première ${id} introuvable.`);
    }

    return {
      id: r.id,
      name: r.name,
      unit: r.unit,
      unitCost: r.unit_cost,
      stockQuantity: r.stock_quantity,
      reorderPoint: r.reorder_point,
      supplierId: r.supplier_id,
      isLowStock: r.stock_quantity <= r.reorder_point,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  public createMaterial(data: {
    name: string;
    unit: string;
    unitCost: number;
    stockQuantity?: number;
    reorderPoint?: number;
    supplierId?: string | null;
  }): MaterialDetail {
    const id = `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    this.db.prepare(`
      INSERT INTO materials (id, name, unit, unit_cost, stock_quantity, reorder_point, supplier_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))
    `).run(
      id,
      data.name.trim(),
      data.unit.trim(),
      data.unitCost,
      data.stockQuantity || 0,
      data.reorderPoint !== undefined ? data.reorderPoint : 10,
      data.supplierId || null
    );

    return this.getMaterialById(id);
  }

  public adjustStock(id: string, delta: number): MaterialDetail {
    const current = this.getMaterialById(id);
    const newStock = current.stockQuantity + delta;

    if (newStock < 0) {
      throw new ValidationError(`Stock matière insuffisant. Actuel: ${current.stockQuantity} ${current.unit}`);
    }

    this.db.prepare(`
      UPDATE materials 
      SET stock_quantity = ?, updated_at = DATETIME('now')
      WHERE id = ?
    `).run(newStock, id);

    return this.getMaterialById(id);
  }
}
