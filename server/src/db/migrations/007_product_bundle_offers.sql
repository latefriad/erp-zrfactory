-- 007_product_bundle_offers.sql
-- Migration: Add has_bundle_offers and bundle_discounts to products table

ALTER TABLE products ADD COLUMN has_bundle_offers INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN bundle_discounts TEXT;
