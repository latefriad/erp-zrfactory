-- 003_production_workflow.sql
-- Migration: Print-on-Demand Production Workflow & Atelier Floor

CREATE TABLE IF NOT EXISTS production_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN (
    'PENDING_DESIGN',
    'READY_FOR_PRINT',
    'PRINTING_DTF',
    'HEAT_PRESS',
    'QUALITY_CHECK',
    'PACKED',
    'READY_FOR_SHIPPING'
  )),
  assigned_operator_id TEXT,
  operator_notes TEXT,
  defect_count INTEGER NOT NULL DEFAULT 0,
  defect_reason TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  updated_at TEXT NOT NULL DEFAULT (DATETIME('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_operator_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_production_items_order ON production_items(order_id);
CREATE INDEX IF NOT EXISTS idx_production_items_order_item ON production_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_production_items_status ON production_items(status);
CREATE INDEX IF NOT EXISTS idx_production_items_operator ON production_items(assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_production_items_created ON production_items(created_at);
