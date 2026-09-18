import React, { useState, useEffect } from 'react';
import { X, Search, PackageCheck, Truck, CheckCircle2, Clock, AlertCircle, Loader2, Layers, MapPin, FileText } from 'lucide-react';
import { OrderTrackingInfo } from '../types/store';
import { storeApi } from '../services/storeApi';
import { recentOrdersService, RecentStoreOrder } from '../services/recentOrders';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialQuery,
}) => {
  if (!isOpen) return null;

  const [recentOrders, setRecentOrders] = useState<RecentStoreOrder[]>(() =>
    recentOrdersService.getRecentOrders()
  );
  const [query, setQuery] = useState(initialQuery || '');
  const [loading, setLoading] = useState(false);
  const [orderInfo, setOrderInfo] = useState<OrderTrackingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (targetQuery?: string) => {
    const q = (targetQuery || query).trim();
    if (!q) {
      setError('يرجى إدخال رقم الطلب (مثال: ZR-202609-0001) أو رقم هاتفك');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await storeApi.trackOrder(q);
      setOrderInfo(data);
    } catch (err: any) {
      setError(err.message || 'لم يتم العثور على أي طلب يطابق هذا الرقم.');
      setOrderInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const recents = recentOrdersService.getRecentOrders();
    setRecentOrders(recents);

    const activeQ = initialQuery || (recents.length > 0 ? recents[0].orderNumber : '');
    if (activeQ) {
      setQuery(activeQ);
      handleSearch(activeQ);
    }
  }, [initialQuery]);

  // Translate status and stage
  const getStageIndex = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'CONFIRMED':
      case 'PROCESSING':
      case 'PRINTING':
        return 1;
      case 'READY':
        return 2;
      case 'SHIPPED':
        return 3;
      case 'DELIVERED':
        return 4;
      default:
        return 0;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'قيد المراجعة والتأكيد', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'PROCESSING':
      case 'PRINTING':
        return { label: 'قيد الطباعة في الورشة (DTF)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'READY':
        return { label: 'جاهز ومغلف للشحن', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'SHIPPED':
        return { label: 'قيد التوصيل مع الموزع', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'DELIVERED':
        return { label: 'تم التسليم بنجاح', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'CANCELLED':
        return { label: 'طلب ملغى', color: 'bg-rose-100 text-rose-800 border-rose-300' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const currentStage = orderInfo ? getStageIndex(orderInfo.status) : 0;

  const stages = [
    { title: 'تم استلام الطلب', desc: 'تسجيل في النظام' },
    { title: 'طباعة وتجهيز', desc: 'ورشة DTF والتطريز' },
    { title: 'جاهز للشحن', desc: 'مراقبة الجودة والتغليف' },
    { title: 'قيد التوصيل', desc: 'مع شركة الشحن' },
    { title: 'تم التسليم', desc: 'الدفع عند الاستلام' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">تتبع حالة طلبيتك</h3>
              <p className="text-[11px] text-slate-500">متابعة مباشرة لمسار التجهيز والشحن لولايتك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Recent Orders Quick Select Chips */}
          {recentOrders.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 block">
                طلباتك المسجلة مؤخراً (اضغط للتتبع الفوري):
              </span>
              <div className="flex flex-wrap gap-2">
                {recentOrders.map(ord => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => {
                      setQuery(ord.orderNumber);
                      handleSearch(ord.orderNumber);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      query === ord.orderNumber
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>#{ord.orderNumber}</span>
                    <span className="text-[10px] text-slate-400">({ord.total.toLocaleString('fr-DZ')} د.ج)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Form */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="أدخل رقم الطلب (مثال: ZR-202609-0001) أو رقم هاتفك..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>بحث</span>}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Order Details Display */}
          {orderInfo && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Order Meta Header */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block">رقم الطلب</span>
                  <span className="font-mono font-extrabold text-blue-600 text-base">
                    {orderInfo.orderNumber}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block">الحالة الحالية</span>
                  <span
                    className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${
                      getStatusLabel(orderInfo.status).color
                    }`}
                  >
                    {getStatusLabel(orderInfo.status).label}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block">وجهة التوصيل</span>
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    {orderInfo.shippingWilaya}
                  </span>
                </div>
              </div>

              {/* Progress Timeline */}
              <div className="py-4">
                <h4 className="text-xs font-bold text-slate-700 mb-4">مسار تنفيذ الطلب:</h4>
                <div className="grid grid-cols-5 gap-2 text-center relative">
                  {stages.map((stg, idx) => {
                    const isPassed = idx <= currentStage;
                    const isCurrent = idx === currentStage;

                    return (
                      <div key={idx} className="flex flex-col items-center space-y-1.5">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                            isCurrent
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md scale-110'
                              : isPassed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isPassed && !isCurrent ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-bold leading-tight ${
                            isCurrent
                              ? 'text-blue-600'
                              : isPassed
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {stg.title}
                        </span>
                        <span className="text-[9px] text-slate-400 hidden sm:block">
                          {stg.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery & Carrier Info */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span className="text-slate-700">
                    شركة الشحن: <strong className="text-slate-900">{orderInfo.deliveryCompany || 'Yalidine Express'}</strong>
                  </span>
                </div>
                {orderInfo.trackingNumber ? (
                  <span className="font-mono font-bold text-blue-700">
                    رقم الطرد: {orderInfo.trackingNumber}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">سيتم تزويدك برقم الطرد فور الشحن</span>
                )}
              </div>

              {/* Uploaded Design/Logo info if exists */}
              {(() => {
                const matching = recentOrders.find(r => r.orderNumber === orderInfo.orderNumber);
                if (matching?.designFileName) {
                  return (
                    <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] text-indigo-500 block">ملف الشعار المرفق:</span>
                          <span className="font-black text-indigo-950">{matching.designFileName}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full border border-indigo-200">
                        مرفق في الطلب ✓
                      </span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">المنتجات في هذا الطلب:</h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden text-xs">
                  {orderInfo.items.map((itm, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between bg-white">
                      <div>
                        <span className="font-bold text-slate-800">{itm.productName}</span>
                        {itm.variantName && (
                          <span className="text-[10px] text-slate-500 mr-2 bg-slate-100 px-1.5 py-0.5 rounded">
                            {itm.variantName}
                          </span>
                        )}
                        <span className="text-slate-400 text-[10px] block">
                          الكمية: {itm.quantity} × {itm.unitPrice.toLocaleString('fr-DZ')} د.ج
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {itm.totalPrice.toLocaleString('fr-DZ')} د.ج
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">المبلغ الإجمالي عند الاستلام:</span>
                <span className="font-black text-base text-blue-600">
                  {Number(orderInfo.total).toLocaleString('fr-DZ')} د.ج
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
