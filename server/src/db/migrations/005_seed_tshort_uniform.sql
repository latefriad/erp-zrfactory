-- 005_seed_tshort_uniform.sql
-- Migration: Seed tshort uniform product and variants into production database

INSERT OR IGNORE INTO products (id, name, sku, description, base_cost, selling_price, is_active, created_at, updated_at)
VALUES ('prod-tshort-uniform', 'tshort uniform', '140', 'T-Shirt uniform haute qualité 100% coton pour entreprises et équipes avec impression DTF personnalisée', 0, 1900, 1, DATETIME('now'), DATETIME('now'));

INSERT OR IGNORE INTO product_cost_components (id, product_id, name, type, cost, is_configurable, created_at, updated_at)
VALUES 
  ('comp-10', 'prod-tshort-uniform', 'T-Shirt Vierge', 'BASE_ITEM', 700, 1, DATETIME('now'), DATETIME('now')),
  ('comp-11', 'prod-tshort-uniform', 'Impression DTF HD', 'PRINTING', 400, 1, DATETIME('now'), DATETIME('now')),
  ('comp-12', 'prod-tshort-uniform', 'Packaging & Étiquette', 'PACKAGING', 50, 1, DATETIME('now'), DATETIME('now'));

INSERT OR IGNORE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES 
  ('var-8', 'prod-tshort-uniform', 'Noir / S', '140-BLK-S', 0, 0, 25, DATETIME('now'), DATETIME('now')),
  ('var-9', 'prod-tshort-uniform', 'Noir / M', '140-BLK-M', 0, 0, 50, DATETIME('now'), DATETIME('now')),
  ('var-10', 'prod-tshort-uniform', 'Noir / L', '140-BLK-L', 0, 0, 40, DATETIME('now'), DATETIME('now')),
  ('var-11', 'prod-tshort-uniform', 'Noir / XL', '140-BLK-XL', 0, 0, 20, DATETIME('now'), DATETIME('now'));
