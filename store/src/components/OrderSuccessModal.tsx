import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, ArrowLeft, PackageCheck, ShoppingBag, Truck, FileText } from 'lucide-react';

interface OrderSuccessModalProps {
  order: any | null;
  onClose: () => void;
  onTrackOrder: (orderNumber: string) => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onTrackOrder,
}) => {
  if (!order) return null;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 text-center p-6 sm:p-8 space-y-5">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h3 className="text-2xl font-black text-slate-900">تم تأكيد طلبك بنجاح!</h3>
          <p className="text-xs text-slate-500 mt-1">
            شكراً لثقتك في مصنع ZR Factory. لقد تم تسجيل طلبك وهو قيد المراجعة والتحضير.
          </p>
        </div>

        {/* Order Number Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
          <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
            رقم الطلب الخاص بك (احفظه لتتبع الشحنة)
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-xl font-black text-blue-600 tracking-wider">
              {order.orderNumber}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
              title="نسخ رقم الطلب"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Uploaded Design / Logo Preview */}
        {(order.designFileUrl || order.designFileName) && (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-3 text-right">
            {order.designFileUrl ? (
              <div className="w-12 h-12 rounded-xl border border-emerald-300 overflow-hidden bg-white shrink-0 shadow-sm">
                <img src={order.designFileUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl border border-emerald-300 bg-white shrink-0 flex items-center justify-center text-emerald-600 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-emerald-700 font-bold block">تم إرفاق الشعار مع طلبك بنجاح ✓</span>
              <span className="text-xs font-black text-slate-900 truncate block">
                {order.designFileName || 'ملف شعار مخصص'}
              </span>
            </div>
          </div>
        )}

        {/* Summary Info */}
        <div className="grid grid-cols-2 gap-3 text-right bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">الزبون:</span>
            <span className="font-bold text-slate-800">{order.customerName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">المبلغ الإجمالي (COD):</span>
            <span className="font-extrabold text-blue-600">
              {Number(order.total).toLocaleString('fr-DZ')} د.ج
            </span>
          </div>
          <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-slate-600 text-[11px]">
            <Truck className="w-3.5 h-3.5 text-blue-500" />
            <span>التوصيل إلى: {order.shippingWilaya || 'الجزائر'}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-blue-900">
          📞 سيتصل بك فريق العمل هاتفياً على رقمك لتأكيد مواصفات التصميم وموعد الشحن.
        </p>

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => onTrackOrder(order.orderNumber)}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <PackageCheck className="w-4 h-4" />
            <span>تتبع حالة هذا الطلب</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            العودة للمتجر ومواصلة التسوق
          </button>
        </div>
      </div>
    </div>
  );
};
