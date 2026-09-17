import Database from 'better-sqlite3';
import { getDatabase } from '../db/connection';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { CostComponent, Product, ProductVariant, CostComponentType } from '@zr-erp/shared';

export interface ProductDetail extends Product {
  totalCost: number;
  grossMarginPercentage: number;
}

export class ProductService {
  private customDb?: Database.Database;

  constructor(db?: Database.Database) {
    this.customDb = db;
  }

  private get db(): Database.Database {
    return this.customDb || getDatabase();
  }

  public calculateProductCost(productId: string): number {
    const row = this.db.prepare(`
      SELECT COALESCE(SUM(cost), 0) as totalCost 
      FROM product_cost_components 
      WHERE product_id = ?
    `).get(productId) as { totalCost: number };

    return row?.totalCost || 0;
  }

  public calculateGrossProfit(sellingPrice: number, cost: number): number {
    return sellingPrice - cost;
  }

  public listProducts(query?: { search?: string; isActive?: boolean }): ProductDetail[] {
    let sql = `SELECT id, name, sku, description, base_cost, selling_price, compare_at_price, image_url, images, features, is_active, created_at, updated_at FROM products WHERE 1=1`;
    const params: any[] = [];

    if (query?.isActive !== undefined) {
      sql += ` AND is_active = ?`;
      params.push(query.isActive ? 1 : 0);
    }

    if (query?.search) {
      sql += ` AND (name LIKE ? OR sku LIKE ?)`;
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    sql += ` ORDER BY created_at DESC`;

    const productRows = this.db.prepare(sql).all(...params) as any[];

    return productRows.map(p => {
      const components = this.getCostComponents(p.id);
      const variants = this.getVariants(p.id);
      const totalCost = components.reduce((sum, c) => sum + c.cost, 0);
      const grossProfit = this.calculateGrossProfit(p.selling_price, totalCost);
      const grossMarginPercentage = p.selling_price > 0
        ? Math.round((grossProfit / p.selling_price) * 100)
        : 0;

      let parsedImages: string[] = [];
      if (p.images) {
        try {
          parsedImages = JSON.parse(p.images);
        } catch {
          parsedImages = [];
        }
      } else if (p.image_url) {
        parsedImages = [p.image_url];
      }

      let parsedFeatures: string[] = [];
      if (p.features) {
        try {
          parsedFeatures = JSON.parse(p.features);
        } catch {
          parsedFeatures = [];
        }
      }

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        description: p.description,
        baseCost: p.base_cost,
        sellingPrice: p.selling_price,
        compareAtPrice: p.compare_at_price || undefined,
        imageUrl: p.image_url || (parsedImages.length > 0 ? parsedImages[0] : null),
        images: parsedImages,
        features: parsedFeatures,
        grossProfit,
        totalCost,
        grossMarginPercentage,
        costComponents: components,
        variants,
        isActive: p.is_active === 1,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    });
  }

  public getProductById(id: string): ProductDetail {
    const p = this.db.prepare(`
      SELECT id, name, sku, description, base_cost, selling_price, compare_at_price, image_url, images, features, is_active, created_at, updated_at 
      FROM products 
      WHERE id = ?
    `).get(id) as any;

    if (!p) {
      throw new NotFoundError(`Produit avec l'identifiant ${id} introuvable.`);
    }

    const components = this.getCostComponents(p.id);
    const variants = this.getVariants(p.id);
    const totalCost = components.reduce((sum, c) => sum + c.cost, 0);
    const grossProfit = this.calculateGrossProfit(p.selling_price, totalCost);
    const grossMarginPercentage = p.selling_price > 0
      ? Math.round((grossProfit / p.selling_price) * 100)
      : 0;

    let parsedImages: string[] = [];
    if (p.images) {
      try {
        parsedImages = JSON.parse(p.images);
      } catch {
        parsedImages = [];
      }
    } else if (p.image_url) {
      parsedImages = [p.image_url];
    }

    let parsedFeatures: string[] = [];
    if (p.features) {
      try {
        parsedFeatures = JSON.parse(p.features);
      } catch {
        parsedFeatures = [];
      }
    }

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      baseCost: p.base_cost,
      sellingPrice: p.selling_price,
      compareAtPrice: p.compare_at_price || undefined,
      imageUrl: p.image_url || (parsedImages.length > 0 ? parsedImages[0] : null),
      images: parsedImages,
      features: parsedFeatures,
      grossProfit,
      totalCost,
      grossMarginPercentage,
      costComponents: components,
      variants,
      isActive: p.is_active === 1,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  }

  public getCostComponents(productId: string): CostComponent[] {
    const rows = this.db.prepare(`
      SELECT id, product_id, name, type, cost, is_configurable 
      FROM product_cost_components 
      WHERE product_id = ?
      ORDER BY cost DESC
    `).all(productId) as any[];

    return rows.map(r => ({
      id: r.id,
      productId: r.product_id,
      name: r.name,
      type: r.type as CostComponentType,
      cost: r.cost,
      isConfigurable: r.is_configurable === 1,
    }));
  }

  public getVariants(productId: string): ProductVariant[] {
    const rows = this.db.prepare(`
      SELECT id, product_id, name, sku, additional_cost, additional_price, stock_quantity 
      FROM product_variants 
      WHERE product_id = ?
      ORDER BY name ASC
    `).all(productId) as any[];

    return rows.map(r => ({
      id: r.id,
      productId: r.product_id,
      name: r.name,
      sku: r.sku,
      additionalCost: r.additional_cost,
      additionalPrice: r.additional_price,
      stockQuantity: r.stock_quantity,
    }));
  }

  public createProduct(data: {
    name: string;
    sku: string;
    description?: string | null;
    sellingPrice: number;
    compareAtPrice?: number;
    imageUrl?: string | null;
    images?: string[];
    features?: string[];
    costComponents?: Array<{ name: string; type: CostComponentType; cost: number }>;
  }): ProductDetail {
    const cleanSku = data.sku.trim().toUpperCase();

    const existing = this.db.prepare('SELECT id FROM products WHERE UPPER(sku) = ?').get(cleanSku);
    if (existing) {
      throw new ConflictError(`Un produit avec le code SKU "${cleanSku}" existe déjà.`);
    }

    const productId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const imagesJson = data.images && data.images.length > 0
      ? JSON.stringify(data.images)
      : (data.imageUrl ? JSON.stringify([data.imageUrl]) : null);
    const mainImageUrl = data.imageUrl || (data.images && data.images.length > 0 ? data.images[0] : null);
    const featuresJson = data.features && data.features.length > 0 ? JSON.stringify(data.features) : null;

    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO products (id, name, sku, description, base_cost, selling_price, compare_at_price, image_url, images, features, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1, DATETIME('now'), DATETIME('now'))
      `).run(
        productId,
        data.name.trim(),
        cleanSku,
        data.description || null,
        data.sellingPrice,
        data.compareAtPrice || null,
        mainImageUrl,
        imagesJson,
        featuresJson
      );

      if (data.costComponents && data.costComponents.length > 0) {
        const insertComp = this.db.prepare(`
          INSERT INTO product_cost_components (id, product_id, name, type, cost, is_configurable, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, DATETIME('now'), DATETIME('now'))
        `);

        for (const comp of data.costComponents) {
          const compId = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          insertComp.run(compId, productId, comp.name.trim(), comp.type, comp.cost);
        }
      }
    });

    tx();

    return this.getProductById(productId);
  }

  public updateProduct(id: string, data: {
    name?: string;
    description?: string | null;
    sellingPrice?: number;
    compareAtPrice?: number | null;
    imageUrl?: string | null;
    images?: string[];
    features?: string[];
    isActive?: boolean;
  }): ProductDetail {
    this.getProductById(id); // Ensure exists

    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name.trim());
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.sellingPrice !== undefined) {
      fields.push('selling_price = ?');
      values.push(data.sellingPrice);
    }
    if (data.compareAtPrice !== undefined) {
      fields.push('compare_at_price = ?');
      values.push(data.compareAtPrice || null);
    }
    if (data.imageUrl !== undefined) {
      fields.push('image_url = ?');
      values.push(data.imageUrl);
    }
    if (data.images !== undefined) {
      fields.push('images = ?');
      values.push(JSON.stringify(data.images));
      if (data.images.length > 0 && !data.imageUrl) {
        fields.push('image_url = ?');
        values.push(data.images[0]);
      }
    }
    if (data.features !== undefined) {
      fields.push('features = ?');
      values.push(JSON.stringify(data.features));
    }
    if (data.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    if (fields.length > 0) {
      fields.push("updated_at = DATETIME('now')");
      values.push(id);
      this.db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    return this.getProductById(id);
  }

  public addCostComponent(productId: string, comp: {
    name: string;
    type: CostComponentType;
    cost: number;
  }): CostComponent {
    this.getProductById(productId); // Ensure exists

    const compId = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    this.db.prepare(`
      INSERT INTO product_cost_components (id, product_id, name, type, cost, is_configurable, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, DATETIME('now'), DATETIME('now'))
    `).run(compId, productId, comp.name.trim(), comp.type, comp.cost);

    return {
      id: compId,
      productId,
      name: comp.name.trim(),
      type: comp.type,
      cost: comp.cost,
      isConfigurable: true,
    };
  }

  public deleteCostComponent(componentId: string): void {
    const row = this.db.prepare('SELECT id FROM product_cost_components WHERE id = ?').get(componentId);
    if (!row) {
      throw new NotFoundError('Composant de coût introuvable.');
    }

    this.db.prepare('DELETE FROM product_cost_components WHERE id = ?').run(componentId);
  }

  public addVariant(productId: string, variant: {
    name: string;
    sku: string;
    additionalCost?: number;
    additionalPrice?: number;
    stockQuantity?: number;
  }): ProductVariant {
    this.getProductById(productId); // Ensure product exists

    const cleanSku = variant.sku.trim().toUpperCase();
    const existing = this.db.prepare('SELECT id FROM product_variants WHERE UPPER(sku) = ?').get(cleanSku);
    if (existing) {
      throw new ConflictError(`Une variante avec le code SKU "${cleanSku}" existe déjà.`);
    }

    const variantId = `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    this.db.prepare(`
      INSERT INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, DATETIME('now'), DATETIME('now'))
    `).run(
      variantId,
      productId,
      variant.name.trim(),
      cleanSku,
      variant.additionalCost || 0,
      variant.additionalPrice || 0,
      variant.stockQuantity || 0
    );

    return {
      id: variantId,
      productId,
      name: variant.name.trim(),
      sku: cleanSku,
      additionalCost: variant.additionalCost || 0,
      additionalPrice: variant.additionalPrice || 0,
      stockQuantity: variant.stockQuantity || 0,
    };
  }

  public updateVariantStock(variantId: string, quantityChange: number): { id: string; newStock: number } {
    const row = this.db.prepare('SELECT id, stock_quantity FROM product_variants WHERE id = ?').get(variantId) as {
      id: string;
      stock_quantity: number;
    } | undefined;

    if (!row) {
      throw new NotFoundError('Variante de produit introuvable.');
    }

    const newStock = row.stock_quantity + quantityChange;
    if (newStock < 0) {
      throw new ValidationError(`Stock insuffisant. Stock disponible: ${row.stock_quantity}`);
    }

    this.db.prepare(`
      UPDATE product_variants 
      SET stock_quantity = ?, updated_at = DATETIME('now')
      WHERE id = ?
    `).run(newStock, variantId);

    return { id: variantId, newStock };
  }

  public deleteProduct(id: string): void {
    const existing = this.getProductById(id);

    const orderItemCount = this.db.prepare(
      'SELECT COUNT(*) as count FROM order_items WHERE product_id = ?'
    ).get(id) as { count: number };

    if (orderItemCount && orderItemCount.count > 0) {
      throw new ConflictError(`Impossible de supprimer le produit "${existing.name}" car ${orderItemCount.count} commande(s) y font référence.`);
    }

    const transaction = this.db.transaction(() => {
      this.db.prepare('DELETE FROM product_cost_components WHERE product_id = ?').run(id);
      this.db.prepare('DELETE FROM product_variants WHERE product_id = ?').run(id);
      this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    });

    transaction();
  }

  public deleteVariant(variantId: string): void {
    const row = this.db.prepare('SELECT id, product_id, name FROM product_variants WHERE id = ?').get(variantId) as {
      id: string;
      product_id: string;
      name: string;
    } | undefined;

    if (!row) {
      throw new NotFoundError('Variante de produit introuvable.');
    }

    const orderItemCount = this.db.prepare(
      'SELECT COUNT(*) as count FROM order_items WHERE variant_id = ?'
    ).get(variantId) as { count: number };

    if (orderItemCount && orderItemCount.count > 0) {
      throw new ConflictError(`Impossible de supprimer la déclinaison "${row.name}" car elle est liée à ${orderItemCount.count} commande(s).`);
    }

    this.db.prepare('DELETE FROM product_variants WHERE id = ?').run(variantId);
  }
}
