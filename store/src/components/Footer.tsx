import React from 'react';
import { PhoneCall, Mail, MapPin, PackageCheck, ShoppingBag, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onOpenTracking: () => void;
  onOpenAbout: () => void;
  onNavigateProducts: () => void;
  onOpenCart: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenTracking,
  onOpenAbout,
  onNavigateProducts,
  onOpenCart,
}) => {
  return (
    <footer className="bg-[#0B1120] text-slate-400 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Logo & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl text-white shadow-md">
                ZR
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl text-white tracking-tight">
                  ZR <span className="text-blue-500">Factory</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium -mt-1">
                  نطبع، وأنتم تبيعون
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              ندمج بين الإبداع والتقنية لتوفير منتجات طباعة مخصصة عالية الجودة للشركات والأفراد والمتاجر الإلكترونية في الجزائر.
            </p>

            <div className="pt-2 flex items-center gap-3 text-slate-400">
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
                aria-label="Facebook"
              >
                FB
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
                aria-label="Instagram"
              >
                IG
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
                aria-label="WhatsApp"
              >
                WA
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-black hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
                aria-label="TikTok"
              >
                TT
              </a>
            </div>
          </div>

          {/* Column 2: Store Links */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wide">المتجر والمنتجات</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={onNavigateProducts}
                  className="hover:text-blue-400 transition-colors"
                >
                  جميع المنتجات والكتالوج
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenCart}
                  className="hover:text-blue-400 transition-colors"
                >
                  سلة المشتريات
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenTracking}
                  className="hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>تتبع طلبك</span>
                </button>
              </li>
              <li>
                <span className="text-slate-500">طباعة DTF بالمتر</span>
              </li>
              <li>
                <span className="text-slate-500">هوديز وتيشيرات بالجملة</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Company & Policies */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wide">الشركة والخدمات</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={onOpenAbout}
                  className="hover:text-blue-400 transition-colors"
                >
                  من نحن وعن المصنع
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenAbout}
                  className="hover:text-blue-400 transition-colors"
                >
                  خدمات الشراكة لأصحاب المتاجر (POD)
                </button>
              </li>
              <li>
                <span className="text-slate-500">سياسة الشحن لـ 58 ولاية</span>
              </li>
              <li>
                <span className="text-slate-500">ضمان الجودة والاستبدال</span>
              </li>
              <li>
                <span className="text-slate-500">الأسئلة الشائعة</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm tracking-wide">تواصل معنا</h4>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                <span>الجزائر العاصمة، الجزائر</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="dir-ltr font-sans">+213 (0) 550 00 00 00</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>contact@zrfactory.dz</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 leading-relaxed mt-2">
                ⏰ أوقات العمل: من السبت إلى الخميس من 08:30 إلى 18:00
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="flex items-center gap-1">
            © 2026 مصنع ZR Factory. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-bold text-[11px] flex items-center gap-1 border border-slate-700">
              🇩🇿 صنع في الجزائر
            </span>
            <span className="text-slate-600">|</span>
            <span>بكل فخر للأيادي الجزائرية</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
