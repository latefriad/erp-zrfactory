import { Product } from '../types/store';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-tshort-uniform',
    name: 'تيشيرت يونيفورم مخصص - ZR Uniform Pro',
    sku: '140',
    description: 'تيشيرت بولو ويونيفورم فاخر مخصص للشركات، الفرق والمؤسسات. مصنوع من قطن 100% عالي الجودة ومتين مع حياكة معززة وطباعة DTF رقمية ثابتة لا تتأثر بالغسيل المتكرر.',
    baseCost: 0,
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
    isActive: true,
    variants: [
      { id: 'var-8', productId: 'prod-tshort-uniform', name: 'Noir / S', sku: '140-BLK-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-9', productId: 'prod-tshort-uniform', name: 'Noir / M', sku: '140-BLK-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-10', productId: 'prod-tshort-uniform', name: 'Noir / L', sku: '140-BLK-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-11', productId: 'prod-tshort-uniform', name: 'Noir / XL', sku: '140-BLK-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-17 21:20:09',
    updatedAt: '2026-09-17 21:20:09',
  },
  {
    id: 'prod-tshirt-oversized',
    name: 'T-Shirt Oversized Premium - قصة عصرية',
    sku: 'TSHIRT-OVR-001',
    description: 'تيشيرت أوفرسايز عصري 100% قطن ممشط فاخر 240 غ/م² بقصة مريحة وأكتاف ساقطة مع طباعة فنية فائقة النقاء تدوم طويلاً.',
    baseCost: 0,
    sellingPrice: 2500,
    compareAtPrice: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&auto=format&fit=crop&q=80'
    ],
    features: [
      'نسيج قطني ثقيل فاخر 240 غرام لا يتقلص ولا يبهت',
      'تصميم Oversized مريح بياقة دائرية مطاطية متينة',
      'تقنية طباعة حديثة بألوان زاهية وتفاصيل دقيقة',
      'مناسب للجنسين ولمختلف الإطلالات اليومية والكاجوال'
    ],
    isActive: true,
    variants: [
      { id: 'var-1', productId: 'prod-tshirt-oversized', name: 'Noir / S', sku: 'TSHIRT-OVR-001-BLK-S', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
      { id: 'var-2', productId: 'prod-tshirt-oversized', name: 'Noir / M', sku: 'TSHIRT-OVR-001-BLK-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 50, createdAt: '', updatedAt: '' },
      { id: 'var-3', productId: 'prod-tshirt-oversized', name: 'Noir / L', sku: 'TSHIRT-OVR-001-BLK-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 40, createdAt: '', updatedAt: '' },
      { id: 'var-4', productId: 'prod-tshirt-oversized', name: 'Noir / XL', sku: 'TSHIRT-OVR-001-BLK-XL', additionalCost: 0, additionalPrice: 0, stockQuantity: 15, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-17 21:20:11',
    updatedAt: '2026-09-17 21:20:11',
  },
  {
    id: 'prod-hoodie-heavyweight',
    name: 'Hoodie Heavyweight 350g - هودي شتوي مبطن',
    sku: 'HOODIE-HVY-002',
    description: 'سويت شيرت بقلنسوة مبطن فائق الدفء بوزن 350 غ/م² مع جيب أمامي متسع وحبل قطني سميك. مثالي للأجواء الباردة والطباعة المخصصة الفاخرة.',
    baseCost: 0,
    sellingPrice: 5500,
    compareAtPrice: 7200,
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&auto=format&fit=crop&q=80'
    ],
    features: [
      'بطانة داخلية ناعمة توفر أقصى درجات الدفء والراحة',
      'قلنسوة مزدوجة الطبقة مع رباط شد متين',
      'أساور وحافة مرنة مضلعة تحافظ على الدفء والشكل الأنيق',
      'متوفر بعدة مقاسات تلائم الجميع'
    ],
    isActive: true,
    variants: [
      { id: 'var-5', productId: 'prod-hoodie-heavyweight', name: 'Gris Chiné / M', sku: 'HOODIE-HVY-002-GRY-M', additionalCost: 0, additionalPrice: 0, stockQuantity: 20, createdAt: '', updatedAt: '' },
      { id: 'var-6', productId: 'prod-hoodie-heavyweight', name: 'Gris Chiné / L', sku: 'HOODIE-HVY-002-GRY-L', additionalCost: 0, additionalPrice: 0, stockQuantity: 25, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-17 21:20:11',
    updatedAt: '2026-09-17 21:20:11',
  },
  {
    id: 'prod-casquette-custom',
    name: 'Casquette Trucker ZR - كاسكيت كلاسيكية فاخرة',
    sku: 'CAP-CUSTOM-003',
    description: 'كاسكيت كلاسيكية ستايل تراكار بـ 5 أجزاء وشبكة خلفية للتهوية مع قفل كباس خلفي قابل للتعديل وتطريز أو طباعة فاخرة حسب الطلب.',
    baseCost: 0,
    sellingPrice: 1600,
    compareAtPrice: 2200,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?w=800&auto=format&fit=crop&q=80'
    ],
    features: [
      'حزام خلفي قابل للتعديل يناسب جميع المقاسات',
      'شبكة خلفية للتهوية تبقيك منتعشاً في جميع الأوقات',
      'حافة منحنية متينة لحماية كاملة من أشعة الشمس',
      'جودة تصنيع وتشطيب عالية ومريحة في الارتداء'
    ],
    isActive: true,
    variants: [
      { id: 'var-7', productId: 'prod-casquette-custom', name: 'Noir / Taille Unique', sku: 'CAP-CUSTOM-003-BLK-U', additionalCost: 0, additionalPrice: 0, stockQuantity: 35, createdAt: '', updatedAt: '' },
    ],
    createdAt: '2026-09-17 21:20:11',
    updatedAt: '2026-09-17 21:20:11',
  },
];

