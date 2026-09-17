-- 004_shipping_logistics.sql
-- Migration: Shipping Logistics, Carrier Integration, Manifests & COD Tracking

-- 1. Shipping Manifests (Bordereaux d'Expédition)
CREATE TABLE IF NOT EXISTS shipping_manifests (
  id TEXT PRIMARY KEY,
  manifest_number TEXT UNIQUE NOT NULL,
  carrier TEXT NOT NULL,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_plate TEXT,
  total_parcels INTEGER NOT NULL DEFAULT 0,
  total_cod_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_by TEXT,
  dispatched_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Extend Orders table with Carrier & Shipping Tracking columns
ALTER TABLE orders ADD COLUMN shipping_manifest_id TEXT REFERENCES shipping_manifests(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN delivery_type TEXT DEFAULT 'DOMICILE';
ALTER TABLE orders ADD COLUMN dispatched_at TEXT;
ALTER TABLE orders ADD COLUMN delivered_at TEXT;
ALTER TABLE orders ADD COLUMN returned_at TEXT;
ALTER TABLE orders ADD COLUMN return_reason TEXT;
ALTER TABLE orders ADD COLUMN cod_remitted_at TEXT;

-- 3. Shipping Rates per Algerian Wilaya (58 Wilayas Matrix)
CREATE TABLE IF NOT EXISTS shipping_rates (
  id TEXT PRIMARY KEY,
  wilaya_code INTEGER UNIQUE NOT NULL,
  wilaya_name TEXT NOT NULL,
  zone_number INTEGER NOT NULL DEFAULT 1,
  fee_domicile REAL NOT NULL DEFAULT 600,
  fee_stop_desk REAL NOT NULL DEFAULT 400,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 4. Indexes for Performance & Search
CREATE INDEX IF NOT EXISTS idx_orders_manifest ON orders(shipping_manifest_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipping_manifests_carrier ON shipping_manifests(carrier);
CREATE INDEX IF NOT EXISTS idx_shipping_manifests_status ON shipping_manifests(status);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_wilaya ON shipping_rates(wilaya_code);
