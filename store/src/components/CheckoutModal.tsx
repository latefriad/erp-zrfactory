import React, { useState, useMemo } from 'react';
import { X, Truck, ShieldCheck, CheckCircle2, AlertCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { ALGERIA_WILAYAS, CartItem, StoreOrderPayload } from '../types/store';
import { storeApi } from '../services/storeApi';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderSuccess: (order: any) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderSuccess,
}) => {
  if (!isOpen) return null;

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedWilayaCode, setSelectedWilayaCode] = useState<number>(16); // Default 16 - Alger
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<'HOME' | 'STOP_DESK'>('HOME');
  const [notes, setNotes] = useState('');
  const [customizationTechnique, setCustomizationTechnique] = useState<'DTF' | 'BRODERIE'>('DTF');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedWilaya = useMemo(() => {
    return ALGERIA_WILAYAS.find(w => w.code === selectedWilayaCode) || ALGERIA_WILAYAS[15];
  }, [selectedWilayaCode]);

  // Total pieces in cart
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  // Dynamic delivery fee based on Algerian geography & Yalidine standards
  const deliveryFee = useMemo(() => {
    const code = selectedWilayaCode;
    const isStopDesk = deliveryOption === 'STOP_DESK';

    // Algiers & immediate surrounding
    if ([16, 9, 35, 42].includes(code)) {
      return isStopDesk ? 350 : 500;
    }
    // High plateaus & North major cities
    if ([31, 25, 19, 15, 23, 5, 2, 6, 10, 13, 14, 18, 20, 21, 22, 24, 26, 27, 28, 29].includes(code)) {
      return isStopDesk ? 450 : 700;
    }
    // Southern & far regions
    return isStopDesk ? 650 : 950;
  }, [selectedWilayaCode, deliveryOption]);

  const subtotal = items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const totalAmount = subtotal + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!customerName.trim()) {
      setErrorMessage('يرجى إدخال اسمك الكامل');
      return;
    }

    const cleanPhone = customerPhone.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage('يرجى إدخال رقم هاتف صحيح (مثال: 0555123456 أو 0666123456)');
      return;
    }

    if (!selectedWilaya) {
      setErrorMessage('يرجى اختيار ولاية التوصيل');
      return;
    }

    if (customizationTechnique === 'BRODERIE' && totalQuantity < 10) {
      setErrorMessage(`⚠️ التطريز الصناعي الفاخر (Broderie) متاح فقط للطلبيات الجماعية ابتداءً من 10 قطع فما فوق. إجمالي قطع سلتك الحالية هو ${totalQuantity} قطع فقط. يرجى زيادة كمية السلة إلى 10 قطع على الأقل، أو اختيار طباعة حرارية DTF.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: StoreOrderPayload = {
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerEmail: customerEmail.trim() || undefined,
        shippingWilaya: `${selectedWilaya.code} - ${selectedWilaya.name} (${selectedWilaya.arName})`,
        shippingCommune: commune.trim() || undefined,
        shippingAddress: address.trim() || undefined,
        deliveryOption,
        deliveryCompany: 'Yalidine Express',
        deliveryFee,
        customizationTechnique,
        notes: [
          notes.trim(),
          customizationTechnique === 'BRODERIE'
            ? `[نوع التخصيص: تطريز صناعي فاخر Broderie (+10 قطع) - السعر يُحدد هاتفياً 📞]`
            : `[نوع التخصيص: طباعة حرارية DTF HD]`
        ].filter(Boolean).join(' - ') || undefined,
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          notes: [
            item.notes,
            customizationTechnique === 'BRODERIE' ? 'تطريز (+10 قطع)' : 'طباعة DTF'
          ].filter(Boolean).join(' | '),
        })),
      };

      const order = await storeApi.createStoreOrder(payload);
      onOrderSuccess(order);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">تأكيد الطلب ومعلومات التوصيل</h3>
              <p className="text-[11px] text-slate-500">الدفع نقداً عند استلام ومعاينة طلبك (COD)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Customer Personal Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              معلومات الزبون
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  الاسم الكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: رابح بوعلام"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  رقم الهاتف (للاتصال والتأكيد) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  required
                  placeholder="05 / 06 / 07 XX XX XX XX"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-right font-mono"
                />
              </div>
            </div>
          </div>

          {/* Customization Technique Selection */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                طريقة التخصيص والطباعة
              </h4>
              <span className="text-[11px] font-bold text-slate-500">
                {customizationTechnique === 'DTF' ? 'طباعة DTF' : 'تطريز (+10 قطع)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: DTF */}
              <button
                type="button"
                onClick={() => setCustomizationTechnique('DTF')}
                className={`p-3.5 rounded-xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer ${
                  customizationTechnique === 'DTF'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-sm ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">طباعة حرارية DTF</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    من 1 قطعة
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1">
                  طباعة رقمية عالية الدقة مشمولة في السعر
                </span>
              </button>

              {/* Option 2: Broderie */}
              <button
                type="button"
                onClick={() => setCustomizationTechnique('BRODERIE')}
                className={`p-3.5 rounded-xl border-2 text-right transition-all flex flex-col justify-between cursor-pointer relative ${
                  customizationTechnique === 'BRODERIE'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 shadow-sm ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">تطريز صناعي فاخر (Broderie)</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                    +10 قطع فقط ⭐
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-800 mt-1">
                  السعر نحدده معك هاتفياً (Prix par appel 📞)
                </span>
              </button>
            </div>

            {customizationTechnique === 'BRODERIE' && totalQuantity < 10 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 leading-relaxed font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  تنبيه: سلتك تحتوي على <b>{totalQuantity} قطع</b> فقط. التطريز متاح للطلبيات ابتداءً من 10 قطع. يمكنك زيادة كمية السلة أو اختيار طباعة DTF.
                </span>
              </div>
            )}
          </div>

          {/* Shipping & Algerian Wilayas */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              عنوان التوصيل (58 ولاية)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  الولاية <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedWilayaCode}
                  onChange={e => setSelectedWilayaCode(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                >
                  {ALGERIA_WILAYAS.map(w => (
                    <option key={w.code} value={w.code}>
                      {w.code} - {w.arName} ({w.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  البلدية
                </label>
                <input
                  type="text"
                  placeholder="مثال: باب الزوار، بئر خادم..."
                  value={commune}
                  onChange={e => setCommune(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>
            </div>

            {/* Delivery Option: Home vs Stop-Desk */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeliveryOption('HOME')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  deliveryOption === 'HOME'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-600'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">توصيل لباب المنزل (Domicile)</span>
                  {deliveryOption === 'HOME' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="text-[11px] text-slate-500 mt-1">
                  يصلك الطرد مباشرة لعنوانك
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryOption('STOP_DESK')}
                className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  deliveryOption === 'STOP_DESK'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-600'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">استلام من المكتب (Stop-Desk)</span>
                  {deliveryOption === 'STOP_DESK' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <span className="text-[11px] text-slate-500 mt-1">
                  استلم من أقرب مكتب ياليدي بتكلفة أقل
                </span>
              </button>
            </div>

            {deliveryOption === 'HOME' && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  العنوان الدقيق / الحي / الشارع
                </label>
                <input
                  type="text"
                  placeholder="مثال: حي النور، عمارة 5، الطابق 2"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                ملاحظات خاصة بالتوصيل (اختياري)
              </label>
              <input
                type="text"
                placeholder="مثال: الاتصال قبل الوصول بـ 30 دقيقة..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
          </div>

          {/* Order Financial Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700 mb-2">ملخص الدفع عند الاستلام</h4>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>المجموع الجزئي ({items.length} منتجات):</span>
              <span className="font-bold text-slate-800">{subtotal.toLocaleString('fr-DZ')} د.ج</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>تكلفة التوصيل إلى ({selectedWilaya.arName}):</span>
              <span className="font-bold text-blue-600">{deliveryFee.toLocaleString('fr-DZ')} د.ج</span>
            </div>

            {customizationTechnique === 'BRODERIE' && (
              <div className="flex items-center justify-between text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-bold">
                <span>تكلفة التطريز الصناعي:</span>
                <span>نحددها معك هاتفياً (Prix par appel 📞)</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-sm">المبلغ الإجمالي للدفع:</span>
              <div className="text-right">
                <span className="text-xl font-black text-blue-600">
                  {totalAmount.toLocaleString('fr-DZ')} <span className="text-xs font-bold">د.ج</span>
                </span>
                {customizationTechnique === 'BRODERIE' && (
                  <span className="block text-[10px] text-amber-700 font-bold">
                    (+ قيمة التطريز المتفق عليها هاتفياً)
                  </span>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer & Submit */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>الدفع نقداً بعد فتح ومعاينة الطرد</span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-70 text-white font-extrabold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إرسال الطلب...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد الطلب الآن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
