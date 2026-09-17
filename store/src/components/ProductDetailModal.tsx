import React, { useState } from 'react';
import { X, ShoppingBag, Check, Layers, AlertCircle, Plus, Minus, Tag } from 'lucide-react';
import { CartItem, Product, ProductVariant } from '../types/store';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  if (!product) return null;

  const variants = product.variants || [];
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.length > 0 ? variants[0] : null
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [addedNotice, setAddedNotice] = useState<boolean>(false);

  const currentPrice = product.sellingPrice + (selectedVariant?.additionalPrice || 0);
  const totalPrice = currentPrice * quantity;

  const handleAdd = () => {
    const cartItemId = `${product.id}-${selectedVariant?.id || 'default'}`;
    const item: CartItem = {
      id: cartItemId,
      productId: product.id,
      productName: product.name,
      productSku: selectedVariant?.sku || product.sku,
      sellingPrice: currentPrice,
      variantId: selectedVariant?.id || null,
      variantName: selectedVariant?.name || null,
      quantity,
      notes: notes.trim() || undefined,
    };

    onAddToCart(item);
    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-lg">تفاصيل المنتج والطلب</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Banner / Mockup */}
          <div className="aspect-[16/9] rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col items-center justify-center p-4 text-white relative">
            <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center mb-2">
              <ShoppingBag className="w-8 h-8 text-blue-400" />
            </div>
            <span className="text-xs font-mono text-slate-400">SKU: {product.sku}</span>
            <div className="absolute top-3 right-3 bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow">
              طباعة DTF عالية الدقة
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900">{product.name}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {product.description || 'منتج مخصص للطباعة حسب الطلب بجودة عالية.'}
            </p>
          </div>

          {/* Variants Selector */}
          {variants.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                اختر المقاس أو اللون ({variants.length} متوفر):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {variants.map(v => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-600'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="font-bold text-xs">{v.name}</span>
                      <span className="text-[10px] text-slate-500 mt-1">
                        {v.additionalPrice > 0 ? `+${v.additionalPrice} د.ج` : 'السعر الأساسي'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-700">الكمية المطلوبة:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-black text-slate-900 w-8 text-center">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Custom Print Instructions / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>ملاحظات التصميم أو الطباعة (اختياري):</span>
              <span className="text-[11px] text-slate-400 font-normal">مثال: موقع الشعار، الاسم المطبوع</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="اكتب أي تعليمات خاصة بالتصميم أو اللون أو رغبتك في إرسال التصميم عبر واتساب..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-500">الإجمالي للمنتج</span>
            <span className="text-xl font-black text-blue-600">
              {totalPrice.toLocaleString('fr-DZ')} <span className="text-xs font-bold">د.ج</span>
            </span>
          </div>

          <button
            onClick={handleAdd}
            disabled={addedNotice}
            className={`px-6 py-3 rounded-xl font-bold text-sm text-white flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
              addedNotice
                ? 'bg-emerald-600 shadow-emerald-600/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
            }`}
          >
            {addedNotice ? (
              <>
                <Check className="w-4 h-4" />
                <span>تمت الإضافة بنجاح!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>أضف إلى السلة</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
