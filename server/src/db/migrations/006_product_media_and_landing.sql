-- 006_product_media_and_landing.sql
-- Migration: Add image_url, images, compare_at_price, and features to products table

ALTER TABLE products ADD COLUMN image_url TEXT;
ALTER TABLE products ADD COLUMN images TEXT;
ALTER TABLE products ADD COLUMN compare_at_price REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN features TEXT;

-- Update existing default products with high-quality sample photos and compare-at prices
UPDATE products SET 
  image_url = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
  images = '[https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80,https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80,https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80]',
  compare_at_price = 2800,
  features = '[100% Coton peigné lourd 240g/m²,Impression DTF HD haute résistance aux lavages,Coupe confortable décontractée (Uniform / Casual),Col rond renforcé indéformable]'
WHERE id = 'prod-tshort-uniform';

UPDATE products SET 
  image_url = 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
  images = '[https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80,https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80]',
  compare_at_price = 3500,
  features = '[Coton premium 240g épais ultra doux,Coupe oversized tendance urbaine,Impression DTF grand format A3,Finition double surpiqûre]'
WHERE id = 'prod-tshirt-oversized';

UPDATE products SET 
  image_url = 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
  images = '[https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80,https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=800&q=80]',
  compare_at_price = 7000,
  features = '[Molleton lourd 350g/m² ultra chaud,Capuche doublée avec cordon épais,Poche kangourou renforcée,Impression DTF avant et dos]'
WHERE id = 'prod-hoodie-heavyweight';

UPDATE products SET 
  image_url = 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80',
  images = '[https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=800&q=80]',
  compare_at_price = 2200,
  features = '[Casquette trucker 5 panneaux,Filet arrière respirant haute qualité,Visière courbée avec surpiqûres,Fermeture snapback réglable]'
WHERE id = 'prod-casquette-custom';
