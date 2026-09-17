-- 001_supabase_schema.sql
-- Complete PostgreSQL Schema for ZR Factory Print-on-Demand ERP on Supabase

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- 2. PARTNERS (Default: Riad 30%, Brother 70%)
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ownership_percentage NUMERIC(5, 2) NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  initial_capital NUMERIC(15, 2) NOT NULL DEFAULT 0,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  partner_id TEXT REFERENCES partners(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. USER_ROLES
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- 5. ACCOUNTING_PERIODS
CREATE TABLE IF NOT EXISTS accounting_periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  is_distributed BOOLEAN NOT NULL DEFAULT false,
  revenue NUMERIC(15, 2) NOT NULL DEFAULT 0,
  cogs NUMERIC(15, 2) NOT NULL DEFAULT 0,
  operating_expenses NUMERIC(15, 2) NOT NULL DEFAULT 0,
  gross_profit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  net_profit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ,
  distributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PARTNER_TRANSACTIONS
CREATE TABLE IF NOT EXISTS partner_transactions (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('CONTRIBUTION', 'WITHDRAWAL', 'PROFIT_DISTRIBUTION', 'ADJUSTMENT')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  accounting_period_id TEXT REFERENCES accounting_periods(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PROFIT_DISTRIBUTIONS
CREATE TABLE IF NOT EXISTS profit_distributions (
  id TEXT PRIMARY KEY,
  accounting_period_id TEXT NOT NULL REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  ownership_percentage NUMERIC(5, 2) NOT NULL,
  profit_share NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(accounting_period_id, partner_id)
);

-- 8. CASH_ACCOUNTS
CREATE TABLE IF NOT EXISTS cash_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CASH', 'BANK', 'CCP', 'BARIDIMOB')),
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'DZD',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. CASH_TRANSACTIONS
CREATE TABLE IF NOT EXISTS cash_transactions (
  id TEXT PRIMARY KEY,
  cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('ORDER_PAYMENT', 'EXPENSE', 'PARTNER_CONTRIBUTION', 'PARTNER_WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT')),
  amount NUMERIC(15, 2) NOT NULL,
  balance_after NUMERIC(15, 2) NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  address TEXT,
  wilaya TEXT NOT NULL,
  commune TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  description TEXT,
  base_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. PRODUCT_VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  additional_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  additional_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. MATERIALS
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  stock_quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(15, 2) NOT NULL DEFAULT 0,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. PRODUCT_COST_COMPONENTS
CREATE TABLE IF NOT EXISTS product_cost_components (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BASE_ITEM', 'PRINTING', 'PACKAGING', 'LABOR', 'SHIPPING', 'OTHER')),
  cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_configurable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. SHIPPING_MANIFESTS
CREATE TABLE IF NOT EXISTS shipping_manifests (
  id TEXT PRIMARY KEY,
  manifest_number TEXT UNIQUE NOT NULL,
  carrier TEXT NOT NULL,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_plate TEXT,
  total_parcels INTEGER NOT NULL DEFAULT 0,
  total_cod_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'DISPATCHED', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  shipping_manifest_id TEXT REFERENCES shipping_manifests(id) ON DELETE SET NULL,
  delivery_type TEXT DEFAULT 'DOMICILE',
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'PRINTING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED')),
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
  discount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total NUMERIC(15, 2) NOT NULL DEFAULT 0,
  cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  profit NUMERIC(15, 2) NOT NULL DEFAULT 0,
  delivery_company TEXT,
  tracking_number TEXT,
  shipping_wilaya TEXT,
  shipping_commune TEXT,
  shipping_address TEXT,
  notes TEXT,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  return_reason TEXT,
  cod_remitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. ORDER_ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  selling_price NUMERIC(15, 2) NOT NULL,
  unit_cost NUMERIC(15, 2) NOT NULL,
  total_cost NUMERIC(15, 2) NOT NULL,
  total_price NUMERIC(15, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  reference TEXT,
  notes TEXT,
  date TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. EXPENSE_CATEGORIES
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- 21. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  attachment TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. PRODUCTION_ITEMS (POD Atelier Kanban)
CREATE TABLE IF NOT EXISTS production_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN (
    'PENDING_DESIGN',
    'READY_FOR_PRINT',
    'PRINTING_DTF',
    'HEAT_PRESS',
    'QUALITY_CHECK',
    'PACKED',
    'READY_FOR_SHIPPING'
  )),
  assigned_operator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  operator_notes TEXT,
  defect_count INTEGER NOT NULL DEFAULT 0,
  defect_reason TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. SHIPPING_RATES (58 Wilayas Matrix)
CREATE TABLE IF NOT EXISTS shipping_rates (
  id TEXT PRIMARY KEY,
  wilaya_code INTEGER UNIQUE NOT NULL,
  wilaya_name TEXT NOT NULL,
  zone_number INTEGER NOT NULL DEFAULT 1,
  fee_domicile NUMERIC(15, 2) NOT NULL DEFAULT 600,
  fee_stop_desk NUMERIC(15, 2) NOT NULL DEFAULT 400,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- 25. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_manifest ON orders(shipping_manifest_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id ON expenses(supplier_id);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_account ON cash_transactions(cash_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(date);

CREATE INDEX IF NOT EXISTS idx_partner_transactions_partner ON partner_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_transactions_type ON partner_transactions(type);
CREATE INDEX IF NOT EXISTS idx_partner_transactions_date ON partner_transactions(date);
CREATE INDEX IF NOT EXISTS idx_partner_transactions_period ON partner_transactions(accounting_period_id);

CREATE INDEX IF NOT EXISTS idx_production_items_order ON production_items(order_id);
CREATE INDEX IF NOT EXISTS idx_production_items_order_item ON production_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_production_items_status ON production_items(status);
CREATE INDEX IF NOT EXISTS idx_production_items_operator ON production_items(assigned_operator_id);

CREATE INDEX IF NOT EXISTS idx_shipping_manifests_carrier ON shipping_manifests(carrier);
CREATE INDEX IF NOT EXISTS idx_shipping_manifests_status ON shipping_manifests(status);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_wilaya ON shipping_rates(wilaya_code);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
