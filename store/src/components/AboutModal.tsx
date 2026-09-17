import React from 'react';
import { X, Award, ShieldCheck, Factory, HeartHandshake, PhoneCall, Mail, MapPin } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrowseProducts: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  onBrowseProducts,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Factory className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">من نحن — مصنع ZR Factory</h3>
              <p className="text-[11px] text-slate-500">شريككم الأول في الطباعة المخصصة والتصنيع بالجزائر</p>
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
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 leading-relaxed">
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-2">رؤيتنا: نطبع، وأنتم تبيعون</h4>
            <p>
              تأسس مصنع <strong>ZR Factory</strong> في الجزائر لتقديم حل متكامل في مجال الطباعة عند الطلب (Print-on-Demand) والملابس المخصصة. نساعد الشباب، العلامات التجارية الصاعدة، والشركات على إطلاق منتجاتهم المطبوعة بأعلى درجات الاحترافية وبأقل المخاطر دون الحاجة لتخزين كميات ضخمة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                <Award className="w-4 h-4" />
                <span>تقنيات طباعة عالمية</span>
              </div>
              <p className="text-xs text-slate-600">
                نعتمد على ماكينات DTF الصناعية وأجهزة التطريز الرقمي مع استخدام أحبار أصلية معتمدة تدوم لسنوات.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>أقمشة قطن 100% جزائرية</span>
              </div>
              <p className="text-xs text-slate-600">
                خامات ملابس منتقاة بعناية فائقة، خياطة متينة، ومقاسات مريحة تلائم رغبات السوق المحلي.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 space-y-2">
            <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-blue-600" />
              <span>خدمة العملاء وأصحاب المتاجر:</span>
            </h5>
            <p className="text-xs text-slate-600">
              سواء كنت ترغب في تيشيرت واحد بتصميمك الخاص، أو كنت صاحب علامة تجارية تبحث عن شريك تصنيع يطبع ويشحن لزبائنك مع تحصيل المبالغ (COD)، ورشتنا في خدمتكم.
            </p>
          </div>

          {/* Contact Details */}
          <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <span>الجزائر العاصمة، الجزائر (التوصيل لجميع الـ 58 ولاية)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <PhoneCall className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="dir-ltr font-sans">+213 (0) 550 00 00 00 / +213 (0) 770 00 00 00</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Mail className="w-4 h-4 text-amber-600 shrink-0" />
              <span>contact@zrfactory.dz</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              onClose();
              onBrowseProducts();
            }}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            تصفح الكتالوج والمنتجات
          </button>
        </div>
      </div>
    </div>
  );
};
