-- Migration 010: Add design file name and design file URL columns to orders table
ALTER TABLE orders ADD COLUMN design_file_name TEXT;
ALTER TABLE orders ADD COLUMN design_file_url TEXT;
