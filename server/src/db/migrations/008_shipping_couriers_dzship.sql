-- 008_shipping_couriers_dzship.sql
-- Migration: Algerian Shipping Couriers via dzship (Elogistia, ZR Express, Ecom Delivery, Yalidine, Sandbox)

CREATE TABLE IF NOT EXISTS courier_configurations (
  id TEXT PRIMARY KEY,
  courier_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  credentials TEXT NOT NULL DEFAULT '{}',
  from_wilaya INTEGER NOT NULL DEFAULT 16,
  default_delivery_type TEXT NOT NULL DEFAULT 'home' CHECK (default_delivery_type IN ('home', 'stopdesk')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

CREATE INDEX IF NOT EXISTS idx_courier_key ON courier_configurations(courier_key);
CREATE INDEX IF NOT EXISTS idx_courier_active ON courier_configurations(is_active);

-- Seed default supported couriers
INSERT OR IGNORE INTO courier_configurations (id, courier_key, name, is_active, is_default, credentials, from_wilaya, default_delivery_type, notes)
VALUES 
  ('cfg-elogistia', 'elogistia', 'Elogistia', 0, 0, '{}', 16, 'home', 'Plateforme Elogistia Express. Nécessite une clé API.'),
  ('cfg-zrexpress', 'zrexpress', 'ZR Express (Procolis)', 0, 0, '{}', 16, 'home', 'Plateforme classique Procolis. Nécessite Token et Key.'),
  ('cfg-zrexpressnew', 'zrexpressnew', 'ZR Express (Nouvelle Plateforme)', 0, 0, '{}', 16, 'home', 'Nouvelle API api.zrexpress.app. Nécessite apiKey et tenantId.'),
  ('cfg-ecomdelivery', 'ecomdelivery', 'Ecom Delivery', 0, 0, '{}', 16, 'home', 'Réseau Ecom Delivery (ecom-dz.com). Nécessite apiKey et apiToken.'),
  ('cfg-yalidine', 'yalidine', 'Yalidine Express', 0, 0, '{}', 16, 'home', 'Réseau Yalidine Express. Nécessite apiId et apiToken.'),
  ('cfg-sandbox', 'sandbox', 'Mode Sandbox (Test sans compte)', 1, 1, '{}', 16, 'home', 'Transporteur de test gratuit pour simuler les expéditions.');
