-- 001_initial_schema.sql
-- Migration: Complete Initial Schema for ZR Factory Print-on-Demand ERP

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 3. USER_ROLES
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 4. PARTNERS (Default: Riad 30%, Brother 70%)
CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ownership_percentage REAL NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  initial_capital REAL NOT NULL DEFAULT 0,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 5. ACCOUNTING_PERIODS
CREATE TABLE IF NOT EXISTS accounting_periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 0,
  is_distributed INTEGER NOT NULL DEFAULT 0,
  revenue REAL NOT NULL DEFAULT 0,
  cogs REAL NOT NULL DEFAULT 0,
  operating_expenses REAL NOT NULL DEFAULT 0,
  gross_profit REAL NOT NULL DEFAULT 0,
  net_profit REAL NOT NULL DEFAULT 0,
  closed_at TEXT,
  distributed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 6. PARTNER_TRANSACTIONS (Ledger-based: contributions, withdrawals, profit distributions)
CREATE TABLE IF NOT EXISTS partner_transactions (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CONTRIBUTION', 'WITHDRAWAL', 'PROFIT_DISTRIBUTION', 'ADJUSTMENT')),
  amount REAL NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,
  accounting_period_id TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE RESTRICT,
  FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id) ON DELETE SET NULL
);

-- 7. PROFIT_DISTRIBUTIONS
CREATE TABLE IF NOT EXISTS profit_distributions (
  id TEXT PRIMARY KEY,
  accounting_period_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  ownership_percentage REAL NOT NULL,
  profit_share REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (accounting_period_id) REFERENCES accounting_periods(id) ON DELETE RESTRICT,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE RESTRICT,
  UNIQUE(accounting_period_id, partner_id)
);

-- 8. CASH_ACCOUNTS (Physical cash, CCP, Bank, BaridiMob)
CREATE TABLE IF NOT EXISTS cash_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CASH', 'BANK', 'CCP', 'BARIDIMOB')),
  balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'DZD',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 9. CASH_TRANSACTIONS (Double-entry / audit linked for cash flow)
CREATE TABLE IF NOT EXISTS cash_transactions (
  id TEXT PRIMARY KEY,
  cash_account_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ORDER_PAYMENT', 'EXPENSE', 'PARTNER_CONTRIBUTION', 'PARTNER_WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT')),
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_id TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id) ON DELETE RESTRICT
);

-- 10. CUSTOMERS (CRM)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  address TEXT,
  wilaya TEXT NOT NULL,
  commune TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 11. SUPPLIERS
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 12. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  description TEXT,
  base_cost REAL NOT NULL DEFAULT 0,
  selling_price REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- 13. PRODUCT_VARIANTS
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  additional_cost REAL NOT NULL DEFAULT 0,
  additional_price REAL NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 14. MATERIALS
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  stock_quantity REAL NOT NULL DEFAULT 0,
  reorder_point REAL NOT NULL DEFAULT 0,
  supplier_id TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 15. PRODUCT_COST_COMPONENTS (Print-on-demand costing: T-shirt, DTF, Packaging, etc.)
CREATE TABLE IF NOT EXISTS product_cost_components (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BASE_ITEM', 'PRINTING', 'PACKAGING', 'LABOR', 'SHIPPING', 'OTHER')),
  cost REAL NOT NULL DEFAULT 0,
  is_configurable INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 16. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'PRINTING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED')),
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  delivery_fee REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  cost REAL NOT NULL DEFAULT 0,
  profit REAL NOT NULL DEFAULT 0,
  delivery_company TEXT,
  tracking_number TEXT,
  shipping_wilaya TEXT,
  shipping_commune TEXT,
  shipping_address TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- 17. ORDER_ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  selling_price REAL NOT NULL,
  unit_cost REAL NOT NULL,
  total_cost REAL NOT NULL,
  total_price REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

-- 18. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  cash_account_id TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  reference TEXT,
  notes TEXT,
  date TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id) ON DELETE RESTRICT
);

-- 19. EXPENSE_CATEGORIES
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- 20. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  supplier_id TEXT,
  cash_account_id TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  attachment TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (cash_account_id) REFERENCES cash_accounts(id) ON DELETE RESTRICT
);

-- 21. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value TEXT,
  newValue TEXT,
  timestamp TEXT NOT NULL DEFAULT (DATETIME('now')),
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 22. SETTINGS
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now'))
);

-- INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

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

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
