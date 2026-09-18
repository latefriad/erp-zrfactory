import React, { useState, useMemo, useRef } from 'react';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  Phone, 
  User, 
  MapPin, 
  Building2, 
  Home, 
  FileText, 
  ShoppingBag, 
  Lock, 
  AlertCircle,
  ThumbsUp
} from 'lucide-react';
import { Product, ProductVariant, ALGERIA_WILAYAS, StoreOrderPayload } from '../types/store';
import { storeApi } from '../services/storeApi';

interface ProductLandingPageProps {
  product: Product;
  onBack: () => void;
  onOrderSuccess: (order: any) => void;
}

interface BundleOffer {
  id: string;
  quantity: number;
  label: string;
  badge?: string;
  discountPerItem: number;
  popular?: boolean;
}

export const ProductLandingPage: React.FC<ProductLandingPageProps> = ({
  product,
  onBack,
  onOrderSuccess,
}) => {
  // Normalize images list
  const allImages = useMemo(() => {
    if (product.images && product.images.length > 0) {
      return product.images;
    }
    if (product.imageUrl) {
      return [product.imageUrl];
    }
    return [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
    ];
  }, [product]);

  // Active gallery image
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Selected variant
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );

  // Check if product has bundle offers enabled (default is true)
  const hasBundles = product.hasBundleOffers !== false;
  const discount2 = product.bundleDiscounts?.discount2 ?? 400;
  const discount3 = product.bundleDiscounts?.discount3 ?? 900;

  // Standard quantity state (when bundle offers are disabled)
  const [standardQuantity, setStandardQuantity] = useState<number>(1);

  // Bundles definition
  const bundleOffers: BundleOffer[] = useMemo(() => [
    {
      id: 'bundle-1',
      quantity: 1,
      label: 'قطعة واحدة',
      discountPerItem: 0,
    },
    {
      id: 'bundle-2',
      quantity: 2,
      label: 'قطعتين (2 قطع)',
      badge: 'الأكثر شعبية ⭐',
      discountPerItem: Math.round(discount2 / 2),
      popular: true,
    },
    {
      id: 'bundle-3',
      quantity: 3,
      label: '3 قطع (عرض التوفير الأكبر 🔥)',
      badge: `توفير ${discount3.toLocaleString('fr-DZ')} د.ج`,
      discountPerItem: Math.round(discount3 / 3),
    },
  ], [discount2, discount3]);

  const [selectedBundleId, setSelectedBundleId] = useState<string>('bundle-1');
  const activeBundle = useMemo(() => {
    return bundleOffers.find(b => b.id === selectedBundleId) || bundleOffers[0];
  }, [bundleOffers, selectedBundleId]);

  // Customization technique state: DTF vs Broderie (+10 pieces minimum, price on call)
  const [customizationTechnique, setCustomizationTechnique] = useState<'DTF' | 'BRODERIE'>('DTF');
  const [broderieQuantity, setBroderieQuantity] = useState<number>(10);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedWilayaCode, setSelectedWilayaCode] = useState<number>(16); // 16 = Alger default
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<'HOME' | 'STOP_DESK'>('HOME');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form reference for smooth scrolling from sticky bar
  const formRef = useRef<HTMLDivElement>(null);

  const selectedWilaya = useMemo(() => {
    return ALGERIA_WILAYAS.find(w => w.code === selectedWilayaCode) || ALGERIA_WILAYAS[15];
  }, [selectedWilayaCode]);

  // Dynamic Yalidine / Algerian delivery fee based on Wilaya code
  const deliveryFee = useMemo(() => {
    const code = selectedWilayaCode;
    const isStopDesk = deliveryOption === 'STOP_DESK';

    // Algiers & surrounding (Blida, Boumerdes, Tipaza)
    if ([16, 9, 35, 42].includes(code)) {
      return isStopDesk ? 350 : 500;
    }
    // Major North & High Plateaus wilayas
    if ([31, 25, 19, 15, 23, 5, 2, 6, 10, 13, 14, 18, 20, 21, 22, 24, 26, 27, 28, 29].includes(code)) {
      return isStopDesk ? 450 : 700;
    }
    // Southern & remote wilayas
    return isStopDesk ? 650 : 950;
  }, [selectedWilayaCode, deliveryOption]);

  // Price calculations
  const unitBasePrice = (product.sellingPrice || 0) + (selectedVariant?.additionalPrice || 0);
  const totalItemsCount = customizationTechnique === 'BRODERIE'
    ? Math.max(10, broderieQuantity)
    : (hasBundles ? activeBundle.quantity : standardQuantity);
  const totalDiscount = (customizationTechnique === 'DTF' && hasBundles)
    ? (activeBundle.discountPerItem * totalItemsCount)
    : 0;
  const productsSubtotal = (unitBasePrice * totalItemsCount) - totalDiscount;
  const totalOrderAmount = productsSubtotal + deliveryFee;

  // Strikethrough price calculation
  const comparePrice = product.compareAtPrice && product.compareAtPrice > unitBasePrice
    ? product.compareAtPrice
    : Math.round(unitBasePrice * 1.35);

  const discountPercentage = Math.round(((comparePrice - unitBasePrice) / comparePrice) * 100);

  // Handlers for gallery
  const handlePrevImage = () => {
    setActiveImageIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  // Scroll to form on CTA click
  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Submit fast COD order
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('يرجى كتابة الاسم واللقب بالكامل');
      scrollToForm();
      return;
    }

    const cleanPhone = customerPhone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('يرجى إدخال رقم هاتف صحيح مكوّن من 9 أو 10 أرقام (مثال: 0550123456 أو 0660123456)');
      scrollToForm();
      return;
    }

    if (!selectedWilaya) {
      setErrorMessage('يرجى اختيار ولاية التوصيل');
      scrollToForm();
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: StoreOrderPayload = {
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        shippingWilaya: `${selectedWilaya.code} - ${selectedWilaya.name} (${selectedWilaya.arName})`,
        shippingCommune: commune.trim() || undefined,
        shippingAddress: address.trim() || undefined,
        deliveryOption,
        deliveryCompany: 'Yalidine Express',
        deliveryFee,
        customizationTechnique,
        notes: [
          notes.trim(),
          `[طلب مباشر من صفحة المنتج]`,
          customizationTechnique === 'BRODERIE'
            ? `[نوع التخصيص: تطريز صناعي فاخر Broderie (+10 قطع) - السعر يُحدد هاتفياً 📞]`
            : `[نوع التخصيص: طباعة حرارية DTF HD]`,
          customizationTechnique === 'BRODERIE'
            ? `الكمية: ${totalItemsCount} قطعة (تطريز)`
            : (hasBundles ? `العرض: ${activeBundle.label}` : `الكمية: ${standardQuantity} قطعة`),
          selectedVariant ? `المقاس/اللون: ${selectedVariant.name}` : ''
        ].filter(Boolean).join(' - '),
        items: [
          {
            productId: product.id,
            variantId: selectedVariant?.id || null,
            quantity: totalItemsCount,
            notes: [
              selectedVariant ? `الخيار: ${selectedVariant.name}` : '',
              customizationTechnique === 'BRODERIE'
                ? 'تطريز صناعي (+10 قطع - السعر يُحدد هاتفياً)'
                : 'طباعة حرارية DTF'
            ].filter(Boolean).join(' | '),
          }
        ]
      };

      const createdOrder = await storeApi.createStoreOrder(payload);
      onOrderSuccess(createdOrder);
    } catch (err: any) {
      console.error('Failed to submit COD order:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى أو الاتصال بنا.');
      scrollToForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Customer reviews mock data with Algerian realistic names & dates
  const customerReviews = [
    {
      name: 'كريم بلحاج',
      wilaya: 'الجزائر العاصمة',
      rating: 5,
      date: 'منذ يومين',
      comment: 'ما شاء الله الجودة توب والقماش 100% قطن حقيقي والطباعة نقية بزاف. وصلني في 24 ساعة للدار وخلصت عند الاستلام. شكراً ZR Factory!',
      verified: true,
    },
    {
      name: 'سفيان مرابط',
      wilaya: 'وهران',
      rating: 5,
      date: 'منذ 4 أيام',
      comment: 'خدمة في القمة، عيطولي أكدوا المقاس والتوصيل جاني لمكتب ياليدين في وهران وخلصت أقل. يعطيكم الصحة وربي يوفقكم.',
      verified: true,
    },
    {
      name: 'ياسين بن عيسى',
      wilaya: 'سطيف',
      rating: 5,
      date: 'منذ أسبوع',
      comment: 'اشتريت عرض 2 قطع، التوفير يستاهل والتغليف محترم جداً. أنصح بالشراء بدون تردد.',
      verified: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 lg:pb-16 font-sans text-right" dir="rtl">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لجميع المنتجات</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline">الرئيسية</span>
            <span className="hidden sm:inline">/</span>
            <span className="hidden sm:inline">المنتجات</span>
            <span className="hidden sm:inline">/</span>
            <span className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
              {product.name}
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* ============================================================ */}
          {/* RIGHT COLUMN: Interactive Image Gallery & Highlights (Desktop) */}
          {/* ============================================================ */}
          <div className="lg:col-span-6 space-y-4">
            {/* Main Image Stage */}
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden aspect-square flex items-center justify-center group">
              <img
                src={allImages[activeImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover object-center transition-all duration-300 group-hover:scale-105"
              />

              {/* Image Counter Badge (like 1 / 4) */}
              <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1.5">
                <span>{activeImageIndex + 1}</span>
                <span className="text-slate-400">/</span>
                <span>{allImages.length}</span>
              </div>

              {/* Discount Tag */}
              {discountPercentage > 0 && (
                <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                  <Flame className="w-3.5 h-3.5" />
                  <span>تخفيض {discountPercentage}%</span>
                </div>
              )}

              {/* Left & Right Arrows (Only if multiple images) */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                    aria-label="Previous image"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                    aria-label="Next image"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      activeImageIndex === idx
                        ? 'border-blue-600 ring-2 ring-blue-600/30 shadow-md scale-105'
                        : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.name} - ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Quality Assurance & Delivery Highlights Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3.5 hidden lg:block">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>ضمانات المتجر والتسوق الآمن</span>
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Truck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">شحن سريع 58 ولاية</span>
                    <span className="text-slate-500 text-[11px]">توصيل للمنزل أو المكتب</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <RotateCcw className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">معاينة قبل الدفع</span>
                    <span className="text-slate-500 text-[11px]">افحص طلبيتك براحتك</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">جودة 100% مضمونة</span>
                    <span className="text-slate-500 text-[11px]">إنتاج مباشر في مصنعنا</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">خدمة عملاء مستمرة</span>
                    <span className="text-slate-500 text-[11px]">متابعة حتى وصول الطلب</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* LEFT COLUMN: Buybox & Fast COD Order Form */}
          {/* ============================================================ */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Header / Badges */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full border border-amber-200">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  الأكثر طلباً هذا الأسبوع
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  متوفر بالمخزون جاهز للشحن
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                {product.name}
              </h1>

              {/* Reviews Stars */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-800">4.9 / 5</span>
                <span className="text-xs text-slate-400">(أكثر من 140 تقييم معتمد)</span>
              </div>
            </div>

            {/* Price Box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 flex items-baseline justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold text-blue-900 block mb-1">السعر الترويجي الخاص:</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-blue-700">
                    {unitBasePrice.toLocaleString('fr-DZ')}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-blue-900">د.ج</span>

                  {comparePrice > unitBasePrice && (
                    <span className="text-sm sm:text-base font-semibold text-slate-400 line-through">
                      {comparePrice.toLocaleString('fr-DZ')} د.ج
                    </span>
                  )}
                </div>
              </div>

              {comparePrice > unitBasePrice && (
                <div className="bg-red-500 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow">
                  وفرت {(comparePrice - unitBasePrice).toLocaleString('fr-DZ')} د.ج
                </div>
              )}
            </div>

            {/* Variant Picker (Sizes / Colors) */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    اختر المقاس / الخيار المطلوب:
                  </label>
                  {selectedVariant && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                      المحدد: {selectedVariant.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
                  {product.variants.map(variant => {
                    const isSelected = selectedVariant?.id === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20 scale-105'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {variant.name}
                        {variant.additionalPrice > 0 && ` (+${variant.additionalPrice} د.ج)`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* CUSTOMIZATION TECHNIQUE PICKER: DTF vs BRODERIE (+10 PCS) */}
            {/* ============================================================ */}
            <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>طريقة التخصيص المطلوبة:</span>
                </label>
                <span className="text-[11px] font-bold text-slate-500">
                  {customizationTechnique === 'DTF' ? 'طباعة حرارية DTF' : 'تطريز صناعي فاخر'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: DTF */}
                <button
                  type="button"
                  onClick={() => setCustomizationTechnique('DTF')}
                  className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                    customizationTechnique === 'DTF'
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-600/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        customizationTechnique === 'DTF' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}>
                        {customizationTechnique === 'DTF' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">طباعة حرارية DTF</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      من 1 قطعة
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    طباعة رقمية عالية الدقة بالألوان الكاملة. مناسبة لأي كمية، السعر مشمول بالكامل.
                  </p>
                </button>

                {/* Option 2: Broderie (+10 pcs, price on call) */}
                <button
                  type="button"
                  onClick={() => {
                    setCustomizationTechnique('BRODERIE');
                    if (broderieQuantity < 10) setBroderieQuantity(10);
                  }}
                  className={`p-3.5 rounded-2xl border-2 text-right transition-all flex flex-col justify-between relative cursor-pointer ${
                    customizationTechnique === 'BRODERIE'
                      ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="absolute -top-2.5 left-4 bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow">
                    +10 قطع فقط ⭐
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        customizationTechnique === 'BRODERIE' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                      }`}>
                        {customizationTechnique === 'BRODERIE' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">تطريز صناعي فاخر (Broderie)</span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="text-[11px] font-extrabold text-amber-800 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-amber-600" />
                      <span>السعر نحدده معك هاتفياً (Prix par appel)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      خيوط فاخرة تدوم طويلاً. متاح للطلبيات من 10 قطع فما فوق. نتصل بك لتحديد سعر التطريز بدقة حسب اللوغو.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quantity / Offers Selector Based on Technique */}
            {customizationTechnique === 'BRODERIE' ? (
              /* Broderie Bulk Quantity Picker (+10 pieces) */
              <div className="space-y-3 bg-amber-50/40 p-4 rounded-2xl border-2 border-amber-300 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    <span>كمية التطريز المطلوبة (الحد الأدنى 10 قطع):</span>
                  </label>
                  <span className="text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                    {broderieQuantity} قطعة
                  </span>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                  {[10, 15, 20, 30, 50, 100].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setBroderieQuantity(qty)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        broderieQuantity === qty
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm scale-105'
                          : 'bg-white text-slate-700 border-amber-200 hover:border-amber-400'
                      }`}
                    >
                      {qty} قطعة
                    </button>
                  ))}
                </div>

                {/* Stepper & Pricing Note */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="inline-flex items-center bg-white rounded-xl p-1 border border-amber-300 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setBroderieQuantity(prev => Math.max(10, prev - 1))}
                      className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center font-black text-amber-900 hover:bg-amber-100 active:scale-95 transition text-base cursor-pointer"
                      title="تقليل الكمية"
                    >
                      -
                    </button>
                    <span className="w-16 text-center font-black text-slate-900 text-base select-none">
                      {broderieQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBroderieQuantity(prev => prev + 1)}
                      className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center font-black text-amber-900 hover:bg-amber-100 active:scale-95 transition text-base cursor-pointer"
                      title="زيادة الكمية"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-[11px] text-amber-950 leading-tight">
                    <span className="font-bold block">
                      سعر الملابس الأساسي: {(unitBasePrice * broderieQuantity).toLocaleString('fr-DZ')} د.ج
                    </span>
                    <span className="text-slate-500">
                      + تكلفة التطريز تُحدد هاتفياً بحسب تفاصيل الشعار
                    </span>
                  </div>
                </div>
              </div>
            ) : hasBundles ? (
              /* Special Bundle Offers for DTF (اختر ووفر - ZimamShops Style) */
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>عروض التوفير الخاصة (اختر الكمية ووفر):</span>
                  </label>
                  <span className="text-[11px] text-blue-600 font-semibold">خصومات إضافية تلقائية</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {bundleOffers.map(bundle => {
                    const isSelected = selectedBundleId === bundle.id;
                    const itemPrice = unitBasePrice - bundle.discountPerItem;
                    const total = itemPrice * bundle.quantity;

                    return (
                      <div
                        key={bundle.id}
                        onClick={() => setSelectedBundleId(bundle.id)}
                        className={`relative cursor-pointer rounded-2xl p-3.5 border-2 transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-600/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {bundle.badge && (
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">
                            {bundle.badge}
                          </div>
                        )}

                        <div className="text-center pt-1">
                          <span className={`block text-xs font-bold mb-1 ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                            {bundle.label}
                          </span>
                          <div className="text-lg font-black text-slate-900">
                            {total.toLocaleString('fr-DZ')} <span className="text-xs font-bold text-slate-500">د.ج</span>
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                          }`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span>{bundle.discountPerItem > 0 ? `وفر ${(bundle.discountPerItem * bundle.quantity).toLocaleString('fr-DZ')} د.ج` : 'سعر الحبة العادي'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Standard Quantity Picker (When bundle offers are disabled) */
              <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                    <span>الكمية المطلوبة:</span>
                  </label>
                  <span className="text-xs font-black text-blue-600">
                    {(unitBasePrice * standardQuantity).toLocaleString('fr-DZ')} د.ج
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setStandardQuantity(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-black text-slate-700 hover:bg-slate-50 active:scale-95 transition text-base cursor-pointer"
                      title="تقليل الكمية"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-black text-slate-900 text-base select-none">
                      {standardQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStandardQuantity(prev => prev + 1)}
                      className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-black text-slate-700 hover:bg-slate-50 active:scale-95 transition text-base cursor-pointer"
                      title="زيادة الكمية"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    (سعر القطعة: {unitBasePrice.toLocaleString('fr-DZ')} د.ج)
                  </span>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* FAST ALGERIAN COD ORDER FORM */}
            {/* ============================================================ */}
            <div 
              ref={formRef} 
              id="order-form"
              className="bg-white rounded-2xl border-2 border-blue-500 shadow-xl overflow-hidden scroll-mt-20"
            >
              {/* Form Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white text-center">
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 mb-1">
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-black text-lg sm:text-xl">
                  استمارة الطلب السريع (الدفع عند الاستلام)
                </h3>
                <p className="text-blue-100 text-xs mt-0.5">
                  يرجى ملء المعلومات وسنتصل بك هاتفياً لتأكيد شحن طلبيتك فوراً
                </p>
              </div>

              {/* Form Body */}
              <form onSubmit={handleOrderSubmit} className="p-4 sm:p-6 space-y-4">
                
                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    الاسم واللقب بالكامل <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: محمد العمري"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm text-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    رقم الهاتف (للاتصال والتوصيل) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      placeholder="مثال: 0550 12 34 56 أو 0660..."
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm text-slate-900 bg-slate-50/50"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    يرجى إدخال رقم هاتف شغال ليتمكن المندوب من الاتصال بك
                  </p>
                </div>

                {/* Wilaya & Commune */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      الولاية (58 ولاية) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={selectedWilayaCode}
                        onChange={e => setSelectedWilayaCode(Number(e.target.value))}
                        className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm text-slate-900 bg-slate-50/50"
                      >
                        {ALGERIA_WILAYAS.map(w => (
                          <option key={w.code} value={w.code}>
                            {w.code} - {w.arName} ({w.name})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      البلدية <span className="text-slate-400 text-[10px]">(اختياري)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: باب الزوار، القبة..."
                      value={commune}
                      onChange={e => setCommune(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm text-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Delivery Option Toggle: Home vs Stop-Desk */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700">
                    مكان استلام الطلبية:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryOption('HOME')}
                      className={`p-3 rounded-xl border-2 text-right transition-all flex items-start gap-2.5 ${
                        deliveryOption === 'HOME'
                          ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Home className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        deliveryOption === 'HOME' ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                      <div>
                        <span className="block text-xs font-bold text-slate-900">توصيل للعنوان / المنزل</span>
                        <span className="text-[10px] text-slate-500">لباب بيتك مباشرة</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryOption('STOP_DESK')}
                      className={`p-3 rounded-xl border-2 text-right transition-all flex items-start gap-2.5 ${
                        deliveryOption === 'STOP_DESK'
                          ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Building2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        deliveryOption === 'STOP_DESK' ? 'text-blue-600' : 'text-slate-400'
                      }`} />
                      <div>
                        <span className="block text-xs font-bold text-slate-900">مكتب التوصيل (Stop-Desk)</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">سعر توصيل مخفض</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Address / Notes */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    العنوان أو ملاحظات خاصة للتوصيل <span className="text-slate-400 text-[10px]">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: الحي، الشارع، أو وقت الاتصال المفضل..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-xs text-slate-900 bg-slate-50/50"
                  />
                </div>

                {/* Live Order Pricing Calculation */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {customizationTechnique === 'BRODERIE'
                        ? `ثمن الملابس الأساسي (${totalItemsCount} قطعة):`
                        : `ثمن المنتجات (${hasBundles ? activeBundle.label : `${standardQuantity} قطع`}):`}
                    </span>
                    <span className="font-bold">{(unitBasePrice * totalItemsCount).toLocaleString('fr-DZ')} د.ج</span>
                  </div>

                  {customizationTechnique === 'BRODERIE' && (
                    <div className="flex justify-between text-amber-900 font-bold bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 items-center">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-amber-600" />
                        <span>تكلفة التطريز الصناعي:</span>
                      </span>
                      <span className="text-amber-800">نحددها معك هاتفياً (Prix par appel) 📞</span>
                    </div>
                  )}

                  {customizationTechnique === 'DTF' && hasBundles && totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                      <span>وفرت مع هذا العرض:</span>
                      <span>-{totalDiscount.toLocaleString('fr-DZ')} د.ج</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>
                      تكلفة التوصيل ({deliveryOption === 'HOME' ? 'لباب المنزل' : 'استلام من المكتب'}):
                    </span>
                    <span className="font-bold text-slate-800">{deliveryFee.toLocaleString('fr-DZ')} د.ج</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="font-black text-slate-900 text-sm">المجموع عند الاستلام:</span>
                    <div className="text-right">
                      <span className="text-xl font-black text-blue-600">
                        {totalOrderAmount.toLocaleString('fr-DZ')}
                      </span>
                      <span className="text-xs font-bold text-blue-900 mr-1">د.ج</span>
                      {customizationTechnique === 'BRODERIE' && (
                        <span className="block text-[10px] text-amber-700 font-bold">
                          (+ قيمة التطريز المتفق عليها هاتفياً)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Instant Order Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 px-6 rounded-2xl text-white font-black text-base sm:text-lg shadow-xl transition-all duration-200 active:scale-[0.99] flex flex-col items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer ${
                    customizationTechnique === 'BRODERIE'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/30'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    <span>
                      {isSubmitting
                        ? 'جاري تسجيل طلبك...'
                        : customizationTechnique === 'BRODERIE'
                          ? `طلب تطريز (${totalItemsCount} قطعة) - وسنتصل بك لتحديد السعر 📞`
                          : 'اضغط هنا للطلب الآن - الدفع عند الاستلام 🚚'}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-white/90">
                    {customizationTechnique === 'BRODERIE'
                      ? 'سيتصل بك مسؤول ورشة التطريز فوراً لتأكيد التفاصيل والتكلفة'
                      : 'معاينة المنتج قبل الدفع - توصيل سريع لجميع الولايات'}
                  </span>
                </button>

                {/* Trust and Safety Micro-badges */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    بياناتك محمية 100%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    ضمان جودة المصنع
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                    إرجاع واستبدال سلس
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* BELOW FOLD: Features, Description, How it works, and Reviews */}
        {/* ============================================================ */}
        <div className="mt-14 pt-10 border-t border-slate-200 space-y-12">
          
          {/* Features Grid */}
          {product.features && product.features.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                <span>مميزات ومواصفات المنتج:</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {product.features.map((feat, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 leading-relaxed">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Description */}
          {product.description && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                <span>الوصف الكامل للمنتج:</span>
              </h2>
              <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {/* 3 Steps to Order Visual */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
            <h3 className="text-xl font-black text-center mb-8">
              كيف تتم عملية الشراء والتوصيل؟
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md">
                  1
                </div>
                <h4 className="font-bold text-base">املأ الاستمارة</h4>
                <p className="text-xs text-slate-300">
                  أدخل اسمك، رقم هاتفك وولايتك في الاستمارة أعلاه واضغط تأكيد الطلب
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md">
                  2
                </div>
                <h4 className="font-bold text-base">اتصال هاتفي للتأكيد</h4>
                <p className="text-xs text-slate-300">
                  يتصل بك فريق خدمة العملاء لتأكيد تفاصيل المقاس والعنوان قبل الشحن
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md">
                  3
                </div>
                <h4 className="font-bold text-base">استلم وافحص وادفع</h4>
                <p className="text-xs text-slate-300">
                  يصلك الطرد في غضون 24-48 ساعة، افحص جودة منتجك وادفع نقداً للموزع
                </p>
              </div>
            </div>
          </div>

          {/* Customer Reviews Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  <ThumbsUp className="w-6 h-6 text-blue-600" />
                  <span>آراء وتقييمات زبائننا الكرام:</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  تجارب حقيقية من مشترين معتمدين استلموا طلبياتهم
                </p>
              </div>

              <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <span className="font-black text-slate-900 text-sm">4.9 من 5</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {customerReviews.map((rev, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex text-amber-400">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400">{rev.date}</span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      "{rev.comment}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{rev.name}</span>
                      <span className="text-[11px] text-slate-400">{rev.wilaya}</span>
                    </div>
                    {rev.verified && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        مشتري موثق
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MOBILE STICKY BOTTOM ORDER BAR */}
      {/* ============================================================ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl z-40 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500">المجموع المطلوب:</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-blue-600">
              {totalOrderAmount.toLocaleString('fr-DZ')}
            </span>
            <span className="text-[10px] font-bold text-slate-800">د.ج</span>
          </div>
        </div>

        <button
          onClick={scrollToForm}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>اطلب الآن (الدفع عند الاستلام)</span>
        </button>
      </div>
    </div>
  );
};
