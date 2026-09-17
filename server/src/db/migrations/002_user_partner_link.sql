-- 002_user_partner_link.sql
-- Migration: Add partner_id reference to users table for partner accounts

ALTER TABLE users ADD COLUMN partner_id TEXT REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_partner_id ON users(partner_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
