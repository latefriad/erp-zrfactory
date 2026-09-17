import React from 'react';
import { ArrowLeft, Sparkles, Truck, CheckCircle2, ShieldAlert, ShoppingBag, Eye } from 'lucide-react';

interface HeroProps {
  onShopClick: () => void;
  onTrackClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onShopClick, onTrackClick }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white py-16 md:py-24 border-b border-slate-800">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(37,99,235,0.15),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.12),transparent_40%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Right Column: Arabic Text & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-right">
            {/* Algerian Flag / Local Brand Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-wide shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>مصنع جزائري 100% — طباعة حسب الطلب (Print-on-Demand)</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.25] text-white">
              ZR Factory — <br />
              <span className="bg-gradient-to-l from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                نطبع، وأنتم تبيعون
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              طباعة مخصصة احترافية للشركات، العلامات التجارية والأفراد في الجزائر. تصاميمك هي، ونحن نحولها إلى واقع بأعلى جودة ألوان DTF وتطريز متقن مع التوصيل إلى جميع ولايات الوطن والدفع عند الاستلام.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onShopClick}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-base transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2.5 group"
              >
                <span>تسوق المنتجات الآن</span>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onTrackClick}
                className="w-full sm:w-auto px-7 py-4 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 active:scale-95 text-slate-200 font-bold text-base transition-all flex items-center justify-center gap-2"
              >
                <Truck className="w-5 h-5 text-blue-400" />
                <span>تتبع طلبيتك</span>
              </button>
            </div>

            {/* Feature Badges */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0">
              <div className="flex flex-col items-center lg:items-start text-center lg:text-right">
                <span className="text-amber-400 font-extrabold text-lg sm:text-xl">58 ولاية</span>
                <span className="text-xs text-slate-400 font-medium">توصيل سريع لباب بيتك</span>
              </div>
              <div className="flex flex-col items-center lg:items-start text-center lg:text-right">
                <span className="text-emerald-400 font-extrabold text-lg sm:text-xl">دفع عند الاستلام</span>
                <span className="text-xs text-slate-400 font-medium">عاين طلبك ثم ادفع</span>
              </div>
              <div className="flex flex-col items-center lg:items-start text-center lg:text-right">
                <span className="text-blue-400 font-extrabold text-lg sm:text-xl">جودة 100%</span>
                <span className="text-xs text-slate-400 font-medium">قطن ممتاز وحبر أصلي</span>
              </div>
            </div>
          </div>

          {/* Left Column: Visual Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md">
              {/* Glow Behind */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-2xl opacity-25 group-hover:opacity-40 transition-opacity" />

              {/* Card */}
              <div className="relative bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs font-mono text-slate-400">ZR-DTF-STUDIO</span>
                </div>

                {/* Simulated Showcase */}
                <div className="space-y-4">
                  <div className="aspect-[4/3] rounded-xl bg-gradient-to-tr from-slate-950 via-slate-800 to-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 relative overflow-hidden group">
                    <div className="w-24 h-24 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                      <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
                    </div>
                    <span className="text-sm font-bold text-white">تيشيرت هودي أوفرسايز مخصص</span>
                    <span className="text-xs text-slate-400 mt-1">طباعة ملونة DTF عالية الدقة</span>

                    <div className="absolute bottom-3 right-3 bg-blue-600 text-white text-[11px] font-black px-2.5 py-1 rounded-md shadow">
                      ابتداءً من 2,400 د.ج
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-300">أقمشة قطنية 100%</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-slate-300">ألوان زاهية لا تتلاشى</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
