import { Product } from '../types/store';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'tshirt-01',
    name: 'T-shirt Coton Premium - تيشيرت قطن فاخر',
    sku: 'TSHIRT-01',
    description: 'تيشيرت كلاسيكي 100% قطن طبيعي عالي الجودة بملمس ناعم ومريح مع حياكة معززة وطباعة DTF رقمية ثابتة لا تتأثر بالغسيل المتكرر.',
    baseCost: 750,
    sellingPrice: 1900,
    compareAtPrice: 2700,
    imageUrl: '/products/tshirt-01.webp',
    images: [
      '/products/tshirt-01.webp',
      'https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/150be85e-0131-410a-b409-2bbf7548820b/img-1.webp'
    ],
    features: [
      'قطن بيور 100% عالي النعومة ومريح طوال اليوم',
      'طباعة رقمية DTF فائقة النقاء تدوم طويلاً وتتحمل الغسيل',
      'حياكة مزدوجة معززة في الأكتاف والياقة لمتانة قصوى',
      'متوفر بـ 4 ألوان راقية وجميع المقاسات من S إلى XXL'
    ],
    hasBundleOffers: true,
    bundleDiscounts: { discount2: 400, discount3: 900 },
    isActive: true,
    variants: [
      // Noir
      { id: 'var-tshirt-01-noir-s', productId: 'tshirt-01', name: 'Noir / S', sku: 'TSHIRT-01-BLK-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-noir-m', productId: 'tshirt-01', name: 'Noir / M', sku: 'TSHIRT-01-BLK-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-noir-l', productId: 'tshirt-01', name: 'Noir / L', sku: 'TSHIRT-01-BLK-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-noir-xl', productId: 'tshirt-01', name: 'Noir / XL', sku: 'TSHIRT-01-BLK-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-noir-xxl', productId: 'tshirt-01', name: 'Noir / XXL', sku: 'TSHIRT-01-BLK-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      // Blanc
      { id: 'var-tshirt-01-blanc-s', productId: 'tshirt-01', name: 'Blanc / S', sku: 'TSHIRT-01-WHT-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-blanc-m', productId: 'tshirt-01', name: 'Blanc / M', sku: 'TSHIRT-01-WHT-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-blanc-l', productId: 'tshirt-01', name: 'Blanc / L', sku: 'TSHIRT-01-WHT-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-blanc-xl', productId: 'tshirt-01', name: 'Blanc / XL', sku: 'TSHIRT-01-WHT-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-blanc-xxl', productId: 'tshirt-01', name: 'Blanc / XXL', sku: 'TSHIRT-01-WHT-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      // Gris
      { id: 'var-tshirt-01-gris-s', productId: 'tshirt-01', name: 'Gris / S', sku: 'TSHIRT-01-GRY-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-gris-m', productId: 'tshirt-01', name: 'Gris / M', sku: 'TSHIRT-01-GRY-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-gris-l', productId: 'tshirt-01', name: 'Gris / L', sku: 'TSHIRT-01-GRY-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-gris-xl', productId: 'tshirt-01', name: 'Gris / XL', sku: 'TSHIRT-01-GRY-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-gris-xxl', productId: 'tshirt-01', name: 'Gris / XXL', sku: 'TSHIRT-01-GRY-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
      // Bleu marine
      { id: 'var-tshirt-01-navy-s', productId: 'tshirt-01', name: 'Bleu marine / S', sku: 'TSHIRT-01-NVY-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-navy-m', productId: 'tshirt-01', name: 'Bleu marine / M', sku: 'TSHIRT-01-NVY-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-navy-l', productId: 'tshirt-01', name: 'Bleu marine / L', sku: 'TSHIRT-01-NVY-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-navy-xl', productId: 'tshirt-01', name: 'Bleu marine / XL', sku: 'TSHIRT-01-NVY-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-tshirt-01-navy-xxl', productId: 'tshirt-01', name: 'Bleu marine / XXL', sku: 'TSHIRT-01-NVY-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-18 10:00:00',
    updatedAt: '2026-09-18 10:00:00',
  },
  {
    id: 'oversize-01',
    name: 'T-shirt Oversize - تيشيرت أوفرسايز عصري',
    sku: 'OVERSIZE-01',
    description: 'تيشيرت أوفرسايز بقصة عصرية واسعة ومريحة مع أكتاف ساقطة، مصنوع من قطن 100% ثقيل فاخر يمنحك إطلالة فريدة ومتميزة.',
    baseCost: 950,
    sellingPrice: 2500,
    compareAtPrice: 3500,
    imageUrl: '/products/oversize-01.webp',
    images: [
      '/products/oversize-01.webp',
      'https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/7dad77a0-f23c-4aa4-a07d-a3478689b23c/img-1.webp'
    ],
    features: [
      'قصة أوفرسايز عصرية فضفاضة وأكتاف ساقطة',
      'قطن ثقيل فاخر 240 غ/م² لا يتقلص ولا يبهت',
      'طباعة فنية عالية الدقة حسب الطلب',
      'مناسب للجنسين ولمختلف الإطلالات اليومية والشبابية'
    ],
    hasBundleOffers: true,
    bundleDiscounts: { discount2: 500, discount3: 1200 },
    isActive: true,
    variants: [
      // Noir
      { id: 'var-ovr-01-noir-m', productId: 'oversize-01', name: 'Noir / M', sku: 'OVERSIZE-01-BLK-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-noir-l', productId: 'oversize-01', name: 'Noir / L', sku: 'OVERSIZE-01-BLK-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-noir-xl', productId: 'oversize-01', name: 'Noir / XL', sku: 'OVERSIZE-01-BLK-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-noir-xxl', productId: 'oversize-01', name: 'Noir / XXL', sku: 'OVERSIZE-01-BLK-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      // Blanc
      { id: 'var-ovr-01-blanc-m', productId: 'oversize-01', name: 'Blanc / M', sku: 'OVERSIZE-01-WHT-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-blanc-l', productId: 'oversize-01', name: 'Blanc / L', sku: 'OVERSIZE-01-WHT-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-blanc-xl', productId: 'oversize-01', name: 'Blanc / XL', sku: 'OVERSIZE-01-WHT-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-blanc-xxl', productId: 'oversize-01', name: 'Blanc / XXL', sku: 'OVERSIZE-01-WHT-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      // Beige
      { id: 'var-ovr-01-beige-m', productId: 'oversize-01', name: 'Beige / M', sku: 'OVERSIZE-01-BGE-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-beige-l', productId: 'oversize-01', name: 'Beige / L', sku: 'OVERSIZE-01-BGE-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-beige-xl', productId: 'oversize-01', name: 'Beige / XL', sku: 'OVERSIZE-01-BGE-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-beige-xxl', productId: 'oversize-01', name: 'Beige / XXL', sku: 'OVERSIZE-01-BGE-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      // Bleu marine
      { id: 'var-ovr-01-navy-m', productId: 'oversize-01', name: 'Bleu marine / M', sku: 'OVERSIZE-01-NVY-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-navy-l', productId: 'oversize-01', name: 'Bleu marine / L', sku: 'OVERSIZE-01-NVY-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-navy-xl', productId: 'oversize-01', name: 'Bleu marine / XL', sku: 'OVERSIZE-01-NVY-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-ovr-01-navy-xxl', productId: 'oversize-01', name: 'Bleu marine / XXL', sku: 'OVERSIZE-01-NVY-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-18 10:00:00',
    updatedAt: '2026-09-18 10:00:00',
  },
  {
    id: 'hoodie-01',
    name: 'Hoodie avec Capuche - هودي شتوي بقلنسوة',
    sku: 'HOODIE-01',
    description: 'سويت شيرت بقلنسوة وجيب كانغارو أمامي واسع، مصنوع من مولتون قطني سميك ومبطن فائق الدفء والنعومة مع رباط شد متين.',
    baseCost: 1450,
    sellingPrice: 3520,
    compareAtPrice: 4800,
    imageUrl: '/products/hoodie-01.webp',
    images: [
      '/products/hoodie-01.webp',
      'https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/c20b58d6-55c7-40ef-8011-595ec6a739bb/img-1.webp'
    ],
    features: [
      'بطانة داخلية ناعمة توفر أقصى درجات الدفء والراحة',
      'قلنسوة مزدوجة الطبقة مع رباط شد قطني سميك',
      'أساور وحافة مرنة مضلعة تحافظ على الدفء والشكل الأنيق',
      'قماش مولتون ممتاز بوزن 320 غ/م² ملائم للطباعة الفاخرة'
    ],
    hasBundleOffers: true,
    bundleDiscounts: { discount2: 600, discount3: 1560 },
    isActive: true,
    variants: [
      // Noir
      { id: 'var-hd-01-noir-s', productId: 'hoodie-01', name: 'Noir / S', sku: 'HOODIE-01-BLK-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-noir-m', productId: 'hoodie-01', name: 'Noir / M', sku: 'HOODIE-01-BLK-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-noir-l', productId: 'hoodie-01', name: 'Noir / L', sku: 'HOODIE-01-BLK-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-noir-xl', productId: 'hoodie-01', name: 'Noir / XL', sku: 'HOODIE-01-BLK-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-noir-xxl', productId: 'hoodie-01', name: 'Noir / XXL', sku: 'HOODIE-01-BLK-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
      // Gris chiné
      { id: 'var-hd-01-gris-s', productId: 'hoodie-01', name: 'Gris chiné / S', sku: 'HOODIE-01-GRY-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-gris-m', productId: 'hoodie-01', name: 'Gris chiné / M', sku: 'HOODIE-01-GRY-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-gris-l', productId: 'hoodie-01', name: 'Gris chiné / L', sku: 'HOODIE-01-GRY-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-gris-xl', productId: 'hoodie-01', name: 'Gris chiné / XL', sku: 'HOODIE-01-GRY-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-gris-xxl', productId: 'hoodie-01', name: 'Gris chiné / XXL', sku: 'HOODIE-01-GRY-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
      // Bleu marine
      { id: 'var-hd-01-navy-s', productId: 'hoodie-01', name: 'Bleu marine / S', sku: 'HOODIE-01-NVY-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-navy-m', productId: 'hoodie-01', name: 'Bleu marine / M', sku: 'HOODIE-01-NVY-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-navy-l', productId: 'hoodie-01', name: 'Bleu marine / L', sku: 'HOODIE-01-NVY-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-navy-xl', productId: 'hoodie-01', name: 'Bleu marine / XL', sku: 'HOODIE-01-NVY-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-navy-xxl', productId: 'hoodie-01', name: 'Bleu marine / XXL', sku: 'HOODIE-01-NVY-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
      // Vert olive
      { id: 'var-hd-01-olive-s', productId: 'hoodie-01', name: 'Vert olive / S', sku: 'HOODIE-01-OLV-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-olive-m', productId: 'hoodie-01', name: 'Vert olive / M', sku: 'HOODIE-01-OLV-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-olive-l', productId: 'hoodie-01', name: 'Vert olive / L', sku: 'HOODIE-01-OLV-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-olive-xl', productId: 'hoodie-01', name: 'Vert olive / XL', sku: 'HOODIE-01-OLV-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      { id: 'var-hd-01-olive-xxl', productId: 'hoodie-01', name: 'Vert olive / XXL', sku: 'HOODIE-01-OLV-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-18 10:00:00',
    updatedAt: '2026-09-18 10:00:00',
  },
  {
    id: 'hoodie-sc-01',
    name: 'Hoodie Sans Capuche - سويت شيرت كول رون',
    sku: 'HOODIE-SC-01',
    description: 'سويت شيرت كلاسيكي بياقة دائرية مريحة (Col Rond) بدون قلنسوة، مصنوع من مولتون ناعم دافئ ومريح جداً للاستخدام اليومي.',
    baseCost: 1100,
    sellingPrice: 2500,
    compareAtPrice: 3600,
    imageUrl: '/products/hoodie-sc-01.webp',
    images: [
      '/products/hoodie-sc-01.webp',
      'https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/0a9aad47-55d6-49f2-bebb-21cdbf4ebdb6/img-1.webp'
    ],
    features: [
      'ياقة دائرية مريحة وأنيقة وسهلة الارتداء',
      'مولتون داخلي ممشط فائق النعومة والتدفئة',
      'حياكة متينة على الحواف والأكمام لمقاومة التمدد',
      'تصميم عملي وأنيق مناسب للعمل والإطلالات الكاجوال'
    ],
    hasBundleOffers: true,
    bundleDiscounts: { discount2: 500, discount3: 1200 },
    isActive: true,
    variants: [
      // Noir
      { id: 'var-hdsc-01-noir-s', productId: 'hoodie-sc-01', name: 'Noir / S', sku: 'HOODIE-SC-01-BLK-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-noir-m', productId: 'hoodie-sc-01', name: 'Noir / M', sku: 'HOODIE-SC-01-BLK-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-noir-l', productId: 'hoodie-sc-01', name: 'Noir / L', sku: 'HOODIE-SC-01-BLK-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-noir-xl', productId: 'hoodie-sc-01', name: 'Noir / XL', sku: 'HOODIE-SC-01-BLK-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-noir-xxl', productId: 'hoodie-sc-01', name: 'Noir / XXL', sku: 'HOODIE-SC-01-BLK-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
      // Gris chiné
      { id: 'var-hdsc-01-gris-s', productId: 'hoodie-sc-01', name: 'Gris chiné / S', sku: 'HOODIE-SC-01-GRY-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-gris-m', productId: 'hoodie-sc-01', name: 'Gris chiné / M', sku: 'HOODIE-SC-01-GRY-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-gris-l', productId: 'hoodie-sc-01', name: 'Gris chiné / L', sku: 'HOODIE-SC-01-GRY-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-gris-xl', productId: 'hoodie-sc-01', name: 'Gris chiné / XL', sku: 'HOODIE-SC-01-GRY-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-gris-xxl', productId: 'hoodie-sc-01', name: 'Gris chiné / XXL', sku: 'HOODIE-SC-01-GRY-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
      // Bleu marine
      { id: 'var-hdsc-01-navy-s', productId: 'hoodie-sc-01', name: 'Bleu marine / S', sku: 'HOODIE-SC-01-NVY-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-navy-m', productId: 'hoodie-sc-01', name: 'Bleu marine / M', sku: 'HOODIE-SC-01-NVY-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-navy-l', productId: 'hoodie-sc-01', name: 'Bleu marine / L', sku: 'HOODIE-SC-01-NVY-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-navy-xl', productId: 'hoodie-sc-01', name: 'Bleu marine / XL', sku: 'HOODIE-SC-01-NVY-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-hdsc-01-navy-xxl', productId: 'hoodie-sc-01', name: 'Bleu marine / XXL', sku: 'HOODIE-SC-01-NVY-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-18 10:00:00',
    updatedAt: '2026-09-18 10:00:00',
  },
  {
    id: 'casquette-01',
    name: 'Casquette Réglable - كاسكيت كلاسيكية فاخرة',
    sku: 'CASQUETTE-01',
    description: 'كاسكيت كلاسيكية فاخرة 100% قطن مع حزام خلفي قابل للتعديل لتناسب كافة المقاسات بدقة، وحافة أمامية مقوسة تقي من الشمس.',
    baseCost: 300,
    sellingPrice: 700,
    compareAtPrice: 1200,
    imageUrl: '/products/casquette-01.webp',
    images: [
      '/products/casquette-01.webp',
      'https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/c70d74cc-f83e-4649-85ee-143433ab3604/img-1.webp'
    ],
    features: [
      'قطن طبيعي 100% متين ومريح مناسب لجميع فصول السنة',
      'حزام خلفي قابل للتعديل (Taille unique réglable) يناسب الجميع',
      'حافة مقوسة متينة تحافظ على شكلها الأنيق وتحمي من الشمس',
      'مناسبة للتطريز أو الطباعة المخصصة لعلامتك التجارية'
    ],
    hasBundleOffers: true,
    bundleDiscounts: { discount2: 150, discount3: 350 },
    isActive: true,
    variants: [
      { id: 'var-csq-01-noir', productId: 'casquette-01', name: 'Noir / Taille unique (réglable)', sku: 'CASQUETTE-01-BLK-U', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-csq-01-blanc', productId: 'casquette-01', name: 'Blanc / Taille unique (réglable)', sku: 'CASQUETTE-01-WHT-U', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-csq-01-beige', productId: 'casquette-01', name: 'Beige / Taille unique (réglable)', sku: 'CASQUETTE-01-BGE-U', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-18 10:00:00',
    updatedAt: '2026-09-18 10:00:00',
  },
  {
    id: 'gilet-01',
    name: 'Gilet Sans Manche Matelassé - فيست وجيلي شتوي مبطن',
    sku: 'GILET-01',
    description: 'فيست وجيلي بدون أكمام مبطن (Matelassé) خفيف الوزن ودافئ جداً مع سحاب أمامي وجيوب عملية، مثالي للإطلالات الشتوية والأنشطة اليومية.',
    baseCost: 1150,
    sellingPrice: 2300,
    compareAtPrice: 3400,
    imageUrl: '/products/gilet-01.webp',
    images: [
      '/products/gilet-01.webp',
      'https://assets.wandit.app/images/11616ed6-d3b8-45d7-b8f4-04c70816ca80/0b863771-a955-43bb-a93b-4d23bdb67c7d/img-1.webp'
    ],
    features: [
      'تصميم مبطن (Matelassé) خفيف الوزن وعازل للبرودة',
      'سحاب أمامي عملي عالي الجودة مع جيوب جانبية بسحاب',
      'تصميم بدون أكمام يوفر حرية حركة كاملة طوال اليوم',
      'مثالي للارتداء فوق الهودي أو السويت شيرت في الأيام الباردة'
    ],
    hasBundleOffers: true,
    bundleDiscounts: { discount2: 450, discount3: 1000 },
    isActive: true,
    variants: [
      // Noir
      { id: 'var-glt-01-noir-s', productId: 'gilet-01', name: 'Noir / S', sku: 'GILET-01-BLK-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-noir-m', productId: 'gilet-01', name: 'Noir / M', sku: 'GILET-01-BLK-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-noir-l', productId: 'gilet-01', name: 'Noir / L', sku: 'GILET-01-BLK-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-noir-xl', productId: 'gilet-01', name: 'Noir / XL', sku: 'GILET-01-BLK-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-noir-xxl', productId: 'gilet-01', name: 'Noir / XXL', sku: 'GILET-01-BLK-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
      // Beige
      { id: 'var-glt-01-beige-s', productId: 'gilet-01', name: 'Beige / S', sku: 'GILET-01-BGE-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-beige-m', productId: 'gilet-01', name: 'Beige / M', sku: 'GILET-01-BGE-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-beige-l', productId: 'gilet-01', name: 'Beige / L', sku: 'GILET-01-BGE-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-beige-xl', productId: 'gilet-01', name: 'Beige / XL', sku: 'GILET-01-BGE-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 30, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-beige-xxl', productId: 'gilet-01', name: 'Beige / XXL', sku: 'GILET-01-BGE-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
      // Bleu marine
      { id: 'var-glt-01-navy-s', productId: 'gilet-01', name: 'Bleu marine / S', sku: 'GILET-01-NVY-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-navy-m', productId: 'gilet-01', name: 'Bleu marine / M', sku: 'GILET-01-NVY-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-navy-l', productId: 'gilet-01', name: 'Bleu marine / L', sku: 'GILET-01-NVY-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-navy-xl', productId: 'gilet-01', name: 'Bleu marine / XL', sku: 'GILET-01-NVY-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-glt-01-navy-xxl', productId: 'gilet-01', name: 'Bleu marine / XXL', sku: 'GILET-01-NVY-XXL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-18 10:00:00',
    updatedAt: '2026-09-18 10:00:00',
  },
  // Previous custom uniform product kept for full compatibility
  {
    id: 'prod-tshort-uniform',
    name: 'تيشيرت يونيفورم مخصص - ZR Uniform Pro',
    sku: '140',
    description: 'تيشيرت بولو ويونيفورم فاخر مخصص للشركات، الفرق والمؤسسات. مصنوع من قطن 100% عالي الجودة ومتين مع حياكة معززة وطباعة DTF رقمية ثابتة لا تتأثر بالغسيل المتكرر.',
    baseCost: 700,
    sellingPrice: 1900,
    compareAtPrice: 2800,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&auto=format&fit=crop&q=80'
    ],
    features: [
      'قطن بيور 100% ممتاز ومريح طوال اليوم',
      'طباعة مخصصة DTF عالية الدقة ومقاومة للغسيل المتكرر',
      'خياطة مزدوجة معززة في الأكتاف والياقة لتحمل الاستخدام الشاق',
      'شحن سريع متوفر لجميع ولايات الوطن الـ 58 مع خيار الدفع عند الاستلام'
    ],
    hasBundleOffers: true,
    bundleDiscounts: { discount2: 400, discount3: 900 },
    isActive: true,
    variants: [
      { id: 'var-8', productId: 'prod-tshort-uniform', name: 'Noir / S', sku: '140-BLK-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-9', productId: 'prod-tshort-uniform', name: 'Noir / M', sku: '140-BLK-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-10', productId: 'prod-tshort-uniform', name: 'Noir / L', sku: '140-BLK-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-11', productId: 'prod-tshort-uniform', name: 'Noir / XL', sku: '140-BLK-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-17 21:20:09',
    updatedAt: '2026-09-17 21:20:09',
  }
];


