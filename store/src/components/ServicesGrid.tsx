import React from 'react';
import { Printer, Layers, Scissors, HeartHandshake } from 'lucide-react';

export const ServicesGrid: React.FC = () => {
  const services = [
    {
      title: 'طباعة مخصصة',
      description: 'طباعة أي تصميم أو شعار على مختلف الملابس والمنتجات بدقة متناهية وأسعار تنافسية.',
      icon: Printer,
      color: 'from-blue-500/20 to-indigo-500/10 text-blue-500 border-blue-500/20',
    },
    {
      title: 'طباعة DTF الحديثة',
      description: 'تقنية Direct-to-Film المتطورة لألوان حيوية لا تتأثر بالغسيل وثبات ممتاز على جميع الأقمشة.',
      icon: Layers,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-500 border-emerald-500/20',
    },
    {
      title: 'تطريز آلي احترافي',
      description: 'تطريز حاسوبي ثلاثي الأبعاد بخيوط متينة وفاخرة مخصص للشركات، القبعات والملابس الرسمية.',
      icon: Scissors,
      color: 'from-amber-500/20 to-yellow-500/10 text-amber-500 border-amber-500/20',
    },
    {
      title: 'منتجات شخصية وهدايا',
      description: 'تصاميم مخصصة للهدايا التذكارية، المناسبات، المجات، الحقائب القماشية والمحافظ.',
      icon: HeartHandshake,
      color: 'from-purple-500/20 to-pink-500/10 text-purple-500 border-purple-500/20',
    },
  ];

  return (
    <section id="services" className="py-16 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-blue-600 font-bold text-xs uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            خدمات الطباعة والتصنيع
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
            خدماتنا المتخصصة للشركات والأفراد
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mt-2">
            نوفر في ZR Factory حلول طباعة وإنتاج متكاملة تلبي احتياجاتك بدقة وسرعة
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((srv, idx) => {
            const Icon = srv.icon;
            return (
              <div
                key={idx}
                className="relative bg-slate-50 hover:bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-400/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group flex flex-col"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${srv.color} border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {srv.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed flex-1">
                  {srv.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
