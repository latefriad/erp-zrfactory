import React from 'react';
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowLeft, ShieldCheck } from 'lucide-react';
import { CartItem } from '../types/store';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onProceedCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedCheckout,
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 left-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-r border-slate-200">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">سلة المشتريات ({totalItems})</h3>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={onClearCart}
                  className="text-[11px] text-rose-600 hover:underline px-2 py-1"
                >
                  إفراغ السلة
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="إغلاق السلة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h4 className="font-bold text-slate-800 text-base">سلتك فارغة حالياً</h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  لم تقم بإضافة أي منتج إلى السلة بعد. اختر منتجك المفضل من الكتالوج واطلبه الآن!
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors"
                >
                  تصفح المنتجات الآن
                </button>
              </div>
            ) : (
              items.map(item => {
                const itemTotal = item.sellingPrice * item.quantity;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {item.productName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          {item.variantName && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                              {item.variantName}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.productSku}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-slate-500 mt-1 bg-white p-1.5 rounded border border-slate-200 line-clamp-2">
                            <span className="font-bold text-slate-600">ملاحظة:</span> {item.notes}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="حذف من السلة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-600 flex items-center justify-center hover:bg-slate-100 active:scale-95 text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs text-slate-900 w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 text-slate-600 flex items-center justify-center hover:bg-slate-100 active:scale-95 text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-left">
                        <span className="font-extrabold text-blue-600 text-sm">
                          {itemTotal.toLocaleString('fr-DZ')} <span className="text-[10px] font-bold">د.ج</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>المجموع الجزئي:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {subtotal.toLocaleString('fr-DZ')} د.ج
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>رسوم التوصيل (58 ولاية):</span>
                  <span className="text-emerald-600 font-bold">تُحسب عند الدفع حسب الولاية</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-sm">الإجمالي التقريبي:</span>
                <span className="text-xl font-black text-blue-600">
                  {subtotal.toLocaleString('fr-DZ')} <span className="text-xs font-bold">د.ج</span>
                </span>
              </div>

              <button
                onClick={onProceedCheckout}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                <span>متابعة الطلب والدفع عند الاستلام</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>دفع آمن 100% نقداً عند استلام ومعاينة الطلب</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
