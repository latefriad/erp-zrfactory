-- 009_seed_catalog_products.sql
-- Migration: Seed 6 official catalog products and variants

INSERT OR REPLACE INTO products (id, name, sku, description, base_cost, selling_price, compare_at_price, image_url, images, features, has_bundle_offers, bundle_discounts, is_active, created_at, updated_at)
VALUES ('tshirt-01', 'T-shirt Coton Premium - تيشيرت قطن فاخر', 'TSHIRT-01', 'تيشيرت كلاسيكي 100% قطن طبيعي عالي الجودة بملمس ناعم ومريح مع حياكة معززة وطباعة DTF رقمية ثابتة لا تتأثر بالغسيل المتكرر.', 750, 1900, 2700, '/products/tshirt-01.webp', '["/products/tshirt-01.webp","https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/150be85e-0131-410a-b409-2bbf7548820b/img-1.webp"]', '["قطن بيور 100% عالي النعومة ومريح طوال اليوم","طباعة رقمية DTF فائقة النقاء تدوم طويلاً وتتحمل الغسيل","حياكة مزدوجة معززة في الأكتاف والياقة لمتانة قصوى","متوفر بـ 4 ألوان راقية وجميع المقاسات من S إلى XXL"]', 1, '{"discount2":400,"discount3":900}', 1, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-noir-s', 'tshirt-01', 'Noir / S', 'TSHIRT-01-BLK-S', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-noir-m', 'tshirt-01', 'Noir / M', 'TSHIRT-01-BLK-M', 0, 0, 50, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-noir-l', 'tshirt-01', 'Noir / L', 'TSHIRT-01-BLK-L', 0, 0, 50, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-noir-xl', 'tshirt-01', 'Noir / XL', 'TSHIRT-01-BLK-XL', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-noir-xxl', 'tshirt-01', 'Noir / XXL', 'TSHIRT-01-BLK-XXL', 0, 0, 20, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-blanc-s', 'tshirt-01', 'Blanc / S', 'TSHIRT-01-WHT-S', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-blanc-m', 'tshirt-01', 'Blanc / M', 'TSHIRT-01-WHT-M', 0, 0, 50, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-blanc-l', 'tshirt-01', 'Blanc / L', 'TSHIRT-01-WHT-L', 0, 0, 50, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-blanc-xl', 'tshirt-01', 'Blanc / XL', 'TSHIRT-01-WHT-XL', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-blanc-xxl', 'tshirt-01', 'Blanc / XXL', 'TSHIRT-01-WHT-XXL', 0, 0, 20, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-gris-s', 'tshirt-01', 'Gris / S', 'TSHIRT-01-GRY-S', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-gris-m', 'tshirt-01', 'Gris / M', 'TSHIRT-01-GRY-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-gris-l', 'tshirt-01', 'Gris / L', 'TSHIRT-01-GRY-L', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-gris-xl', 'tshirt-01', 'Gris / XL', 'TSHIRT-01-GRY-XL', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-gris-xxl', 'tshirt-01', 'Gris / XXL', 'TSHIRT-01-GRY-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-navy-s', 'tshirt-01', 'Bleu marine / S', 'TSHIRT-01-NVY-S', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-navy-m', 'tshirt-01', 'Bleu marine / M', 'TSHIRT-01-NVY-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-navy-l', 'tshirt-01', 'Bleu marine / L', 'TSHIRT-01-NVY-L', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-navy-xl', 'tshirt-01', 'Bleu marine / XL', 'TSHIRT-01-NVY-XL', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-tshirt-01-navy-xxl', 'tshirt-01', 'Bleu marine / XXL', 'TSHIRT-01-NVY-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO products (id, name, sku, description, base_cost, selling_price, compare_at_price, image_url, images, features, has_bundle_offers, bundle_discounts, is_active, created_at, updated_at)
VALUES ('oversize-01', 'T-shirt Oversize - تيشيرت أوفرسايز عصري', 'OVERSIZE-01', 'تيشيرت أوفرسايز بقصة عصرية واسعة ومريحة مع أكتاف ساقطة، مصنوع من قطن 100% ثقيل فاخر يمنحك إطلالة فريدة ومتميزة.', 950, 2500, 3500, '/products/oversize-01.webp', '["/products/oversize-01.webp","https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/7dad77a0-f23c-4aa4-a07d-a3478689b23c/img-1.webp"]', '["قصة أوفرسايز عصرية فضفاضة وأكتاف ساقطة","قطن ثقيل فاخر 240 غ/م² لا يتقلص ولا يبهت","طباعة فنية عالية الدقة حسب الطلب","مناسب للجنسين ولمختلف الإطلالات اليومية والشبابية"]', 1, '{"discount2":500,"discount3":1200}', 1, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-noir-m', 'oversize-01', 'Noir / M', 'OVERSIZE-01-BLK-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-noir-l', 'oversize-01', 'Noir / L', 'OVERSIZE-01-BLK-L', 0, 0, 50, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-noir-xl', 'oversize-01', 'Noir / XL', 'OVERSIZE-01-BLK-XL', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-noir-xxl', 'oversize-01', 'Noir / XXL', 'OVERSIZE-01-BLK-XXL', 0, 0, 20, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-blanc-m', 'oversize-01', 'Blanc / M', 'OVERSIZE-01-WHT-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-blanc-l', 'oversize-01', 'Blanc / L', 'OVERSIZE-01-WHT-L', 0, 0, 50, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-blanc-xl', 'oversize-01', 'Blanc / XL', 'OVERSIZE-01-WHT-XL', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-blanc-xxl', 'oversize-01', 'Blanc / XXL', 'OVERSIZE-01-WHT-XXL', 0, 0, 20, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-beige-m', 'oversize-01', 'Beige / M', 'OVERSIZE-01-BGE-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-beige-l', 'oversize-01', 'Beige / L', 'OVERSIZE-01-BGE-L', 0, 0, 50, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-beige-xl', 'oversize-01', 'Beige / XL', 'OVERSIZE-01-BGE-XL', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-beige-xxl', 'oversize-01', 'Beige / XXL', 'OVERSIZE-01-BGE-XXL', 0, 0, 20, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-navy-m', 'oversize-01', 'Bleu marine / M', 'OVERSIZE-01-NVY-M', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-navy-l', 'oversize-01', 'Bleu marine / L', 'OVERSIZE-01-NVY-L', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-navy-xl', 'oversize-01', 'Bleu marine / XL', 'OVERSIZE-01-NVY-XL', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-ovr-01-navy-xxl', 'oversize-01', 'Bleu marine / XXL', 'OVERSIZE-01-NVY-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO products (id, name, sku, description, base_cost, selling_price, compare_at_price, image_url, images, features, has_bundle_offers, bundle_discounts, is_active, created_at, updated_at)
VALUES ('hoodie-01', 'Hoodie avec Capuche - هودي شتوي بقلنسوة', 'HOODIE-01', 'سويت شيرت بقلنسوة وجيب كانغارو أمامي واسع، مصنوع من مولتون قطني سميك ومبطن فائق الدفء والنعومة مع رباط شد متين.', 1450, 3520, 4800, '/products/hoodie-01.webp', '["/products/hoodie-01.webp","https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/c20b58d6-55c7-40ef-8011-595ec6a739bb/img-1.webp"]', '["بطانة داخلية ناعمة توفر أقصى درجات الدفء والراحة","قلنسوة مزدوجة الطبقة مع رباط شد قطني سميك","أساور وحافة مرنة مضلعة تحافظ على الدفء والشكل الأنيق","قماش مولتون ممتاز بوزن 320 غ/م² ملائم للطباعة الفاخرة"]', 1, '{"discount2":600,"discount3":1560}', 1, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-noir-s', 'hoodie-01', 'Noir / S', 'HOODIE-01-BLK-S', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-noir-m', 'hoodie-01', 'Noir / M', 'HOODIE-01-BLK-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-noir-l', 'hoodie-01', 'Noir / L', 'HOODIE-01-BLK-L', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-noir-xl', 'hoodie-01', 'Noir / XL', 'HOODIE-01-BLK-XL', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-noir-xxl', 'hoodie-01', 'Noir / XXL', 'HOODIE-01-BLK-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-gris-s', 'hoodie-01', 'Gris chiné / S', 'HOODIE-01-GRY-S', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-gris-m', 'hoodie-01', 'Gris chiné / M', 'HOODIE-01-GRY-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-gris-l', 'hoodie-01', 'Gris chiné / L', 'HOODIE-01-GRY-L', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-gris-xl', 'hoodie-01', 'Gris chiné / XL', 'HOODIE-01-GRY-XL', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-gris-xxl', 'hoodie-01', 'Gris chiné / XXL', 'HOODIE-01-GRY-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-navy-s', 'hoodie-01', 'Bleu marine / S', 'HOODIE-01-NVY-S', 0, 0, 20, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-navy-m', 'hoodie-01', 'Bleu marine / M', 'HOODIE-01-NVY-M', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-navy-l', 'hoodie-01', 'Bleu marine / L', 'HOODIE-01-NVY-L', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-navy-xl', 'hoodie-01', 'Bleu marine / XL', 'HOODIE-01-NVY-XL', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-navy-xxl', 'hoodie-01', 'Bleu marine / XXL', 'HOODIE-01-NVY-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-olive-s', 'hoodie-01', 'Vert olive / S', 'HOODIE-01-OLV-S', 0, 0, 20, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-olive-m', 'hoodie-01', 'Vert olive / M', 'HOODIE-01-OLV-M', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-olive-l', 'hoodie-01', 'Vert olive / L', 'HOODIE-01-OLV-L', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-olive-xl', 'hoodie-01', 'Vert olive / XL', 'HOODIE-01-OLV-XL', 0, 0, 20, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hd-01-olive-xxl', 'hoodie-01', 'Vert olive / XXL', 'HOODIE-01-OLV-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO products (id, name, sku, description, base_cost, selling_price, compare_at_price, image_url, images, features, has_bundle_offers, bundle_discounts, is_active, created_at, updated_at)
VALUES ('hoodie-sc-01', 'Hoodie Sans Capuche - سويت شيرت كول رون', 'HOODIE-SC-01', 'سويت شيرت كلاسيكي بياقة دائرية مريحة (Col Rond) بدون قلنسوة، مصنوع من مولتون ناعم دافئ ومريح جداً للاستخدام اليومي.', 1100, 2500, 3600, '/products/hoodie-sc-01.webp', '["/products/hoodie-sc-01.webp","https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/0a9aad47-55d6-49f2-bebb-21cdbf4ebdb6/img-1.webp"]', '["ياقة دائرية مريحة وأنيقة وسهلة الارتداء","مولتون داخلي ممشط فائق النعومة والتدفئة","حياكة متينة على الحواف والأكمام لمقاومة التمدد","تصميم عملي وأنيق مناسب للعمل والإطلالات الكاجوال"]', 1, '{"discount2":500,"discount3":1200}', 1, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-noir-s', 'hoodie-sc-01', 'Noir / S', 'HOODIE-SC-01-BLK-S', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-noir-m', 'hoodie-sc-01', 'Noir / M', 'HOODIE-SC-01-BLK-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-noir-l', 'hoodie-sc-01', 'Noir / L', 'HOODIE-SC-01-BLK-L', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-noir-xl', 'hoodie-sc-01', 'Noir / XL', 'HOODIE-SC-01-BLK-XL', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-noir-xxl', 'hoodie-sc-01', 'Noir / XXL', 'HOODIE-SC-01-BLK-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-gris-s', 'hoodie-sc-01', 'Gris chiné / S', 'HOODIE-SC-01-GRY-S', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-gris-m', 'hoodie-sc-01', 'Gris chiné / M', 'HOODIE-SC-01-GRY-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-gris-l', 'hoodie-sc-01', 'Gris chiné / L', 'HOODIE-SC-01-GRY-L', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-gris-xl', 'hoodie-sc-01', 'Gris chiné / XL', 'HOODIE-SC-01-GRY-XL', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-gris-xxl', 'hoodie-sc-01', 'Gris chiné / XXL', 'HOODIE-SC-01-GRY-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-navy-s', 'hoodie-sc-01', 'Bleu marine / S', 'HOODIE-SC-01-NVY-S', 0, 0, 20, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-navy-m', 'hoodie-sc-01', 'Bleu marine / M', 'HOODIE-SC-01-NVY-M', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-navy-l', 'hoodie-sc-01', 'Bleu marine / L', 'HOODIE-SC-01-NVY-L', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-navy-xl', 'hoodie-sc-01', 'Bleu marine / XL', 'HOODIE-SC-01-NVY-XL', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-hdsc-01-navy-xxl', 'hoodie-sc-01', 'Bleu marine / XXL', 'HOODIE-SC-01-NVY-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO products (id, name, sku, description, base_cost, selling_price, compare_at_price, image_url, images, features, has_bundle_offers, bundle_discounts, is_active, created_at, updated_at)
VALUES ('casquette-01', 'Casquette Réglable - كاسكيت كلاسيكية فاخرة', 'CASQUETTE-01', 'كاسكيت كلاسيكية فاخرة 100% قطن مع حزام خلفي قابل للتعديل لتناسب كافة المقاسات بدقة، وحافة أمامية مقوسة تقي من الشمس.', 300, 700, 1200, '/products/casquette-01.webp', '["/products/casquette-01.webp","https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/c70d74cc-f83e-4649-85ee-143433ab3604/img-1.webp"]', '["قطن طبيعي 100% متين ومريح مناسب لجميع فصول السنة","حزام خلفي قابل للتعديل (Taille unique réglable) يناسب الجميع","حافة مقوسة متينة تحافظ على شكلها الأنيق وتحمي من الشمس","مناسبة للتطريز أو الطباعة المخصصة لعلامتك التجارية"]', 1, '{"discount2":150,"discount3":350}', 1, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-csq-01-noir', 'casquette-01', 'Noir / Taille unique (réglable)', 'CASQUETTE-01-BLK-U', 0, 0, 50, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-csq-01-blanc', 'casquette-01', 'Blanc / Taille unique (réglable)', 'CASQUETTE-01-WHT-U', 0, 0, 50, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-csq-01-beige', 'casquette-01', 'Beige / Taille unique (réglable)', 'CASQUETTE-01-BGE-U', 0, 0, 50, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO products (id, name, sku, description, base_cost, selling_price, compare_at_price, image_url, images, features, has_bundle_offers, bundle_discounts, is_active, created_at, updated_at)
VALUES ('gilet-01', 'Gilet Sans Manche Matelassé - فيست وجيلي شتوي مبطن', 'GILET-01', 'فيست وجيلي بدون أكمام مبطن (Matelassé) خفيف الوزن ودافئ جداً مع سحاب أمامي وجيوب عملية، مثالي للإطلالات الشتوية والأنشطة اليومية.', 1150, 2300, 3400, '/products/gilet-01.webp', '["/products/gilet-01.webp","https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/0b863771-a955-43bb-a93b-4d23bdb67c7d/img-1.webp"]', '["تصميم مبطن (Matelassé) خفيف الوزن وعازل للبرودة","سحاب أمامي عملي عالي الجودة مع جيوب جانبية بسحاب","تصميم بدون أكمام يوفر حرية حركة كاملة طوال اليوم","مثالي للارتداء فوق الهودي أو السويت شيرت في الأيام الباردة"]', 1, '{"discount2":450,"discount3":1000}', 1, DATETIME('now'), DATETIME('now'));

INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-noir-s', 'gilet-01', 'Noir / S', 'GILET-01-BLK-S', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-noir-m', 'gilet-01', 'Noir / M', 'GILET-01-BLK-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-noir-l', 'gilet-01', 'Noir / L', 'GILET-01-BLK-L', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-noir-xl', 'gilet-01', 'Noir / XL', 'GILET-01-BLK-XL', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-noir-xxl', 'gilet-01', 'Noir / XXL', 'GILET-01-BLK-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-beige-s', 'gilet-01', 'Beige / S', 'GILET-01-BGE-S', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-beige-m', 'gilet-01', 'Beige / M', 'GILET-01-BGE-M', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-beige-l', 'gilet-01', 'Beige / L', 'GILET-01-BGE-L', 0, 0, 40, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-beige-xl', 'gilet-01', 'Beige / XL', 'GILET-01-BGE-XL', 0, 0, 30, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-beige-xxl', 'gilet-01', 'Beige / XXL', 'GILET-01-BGE-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-navy-s', 'gilet-01', 'Bleu marine / S', 'GILET-01-NVY-S', 0, 0, 20, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-navy-m', 'gilet-01', 'Bleu marine / M', 'GILET-01-NVY-M', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-navy-l', 'gilet-01', 'Bleu marine / L', 'GILET-01-NVY-L', 0, 0, 35, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-navy-xl', 'gilet-01', 'Bleu marine / XL', 'GILET-01-NVY-XL', 0, 0, 25, DATETIME('now'), DATETIME('now'));
INSERT OR REPLACE INTO product_variants (id, product_id, name, sku, additional_cost, additional_price, stock_quantity, created_at, updated_at)
VALUES ('var-glt-01-navy-xxl', 'gilet-01', 'Bleu marine / XXL', 'GILET-01-NVY-XXL', 0, 0, 15, DATETIME('now'), DATETIME('now'));

