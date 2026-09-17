import React from 'react';
import { Zap, ShieldCheck, MapPin, Award, CheckCircle } from 'lucide-react';

export const WhyChooseUs: React.FC = () => {
  const reasons = [
    {
      title: 'تسليم سريع لـ 58 ولاية',
      desc: 'شحن آمن وموثوق خلال 2 إلى 4 أيام عمل إلى باب منزلك أو أقرب مكتب استلام في جميع ولايات الجزائر.',
      icon: Zap,
      badge: 'توصيل ياليدي وزد آر',
    },
    {
      title: 'جودة استثنائية وألوان تدوم',
      desc: 'نستخدم أحبار DTF أصلية وأقمشة قطن 100% لا تتشقق ولا تبهت مع تكرار الغسيل، بضمان كامل.',
      icon: ShieldCheck,
      badge: 'ضمان الجودة 100%',
    },
    {
      title: 'مصنع محلي — صنع في الجزائر',
      desc: 'فريق عمل جزائري مؤهل يفهم متطلبات السوق ويقدم أسعاراً تنافسية مباشرة من المصنع دون وسطاء.',
      icon: MapPin,
      badge: '100% منتج محلي',
    },
  ];

  return (
    <section className="py-16 bg-slate-900 text-white border-b border-slate-800 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.1),transparent_50%)]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-blue-400 font-bold text-xs uppercase tracking-wider bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800">
            لماذا يختارنا العملاء؟
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-3">
            لماذا تختار مصنع ZR Factory؟
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2">
            شريكك الموثوق لتأسيس علامتك التجارية وتلبية جميع طلبيات الطباعة المخصصة
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reasons.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-7 hover:border-blue-500/50 hover:bg-slate-800 transition-all duration-300 relative group flex flex-col"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700">
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed flex-1">
                  {item.desc}
                </p>

                <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>معتمد ومضمون من ورشة ZR</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
