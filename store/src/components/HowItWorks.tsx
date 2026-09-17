import React from 'react';
import { ShoppingCart, UploadCloud, Truck } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'اختر منتجك والمقاس',
      desc: 'تصفح تشكيلتنا من التيشيرات، الهوديز، المجات، والحقائب القماشية واختر المقاس واللون المناسب لك.',
      icon: ShoppingCart,
    },
    {
      number: '02',
      title: 'أدخل معلوماتك وعنوانك',
      desc: 'املأ اسمك ورقم هاتفك واختر ولايتك من بين 58 ولاية، مع خيار التوصيل للمنزل أو استلام من المكتب.',
      icon: UploadCloud,
    },
    {
      number: '03',
      title: 'نطبع ونوصلك لباب البيت',
      desc: 'نطبع طلبك بتقنية DTF فائقة الجودة ونوصله سريعاً، وتدفع المبلغ نقداً عند استلام ومعاينة طلبك.',
      icon: Truck,
    },
  ];

  return (
    <section className="py-16 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-blue-600 font-bold text-xs uppercase tracking-wider bg-blue-100/60 px-3 py-1 rounded-full border border-blue-200">
            خطوات بسيطة
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
            كيف تطلب من متجر ZR Factory؟
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mt-2">
            تجربة تسوق سلسة وسريعة بدون تعقيد وبدون دفع مسبق
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center group"
              >
                {/* Step Number Bubble */}
                <div className="absolute -top-4 right-6 w-9 h-9 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                  {step.number}
                </div>

                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Icon className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
