import React, { useState } from 'react';
import { ShoppingBag, Search, Menu, X, PackageCheck, PhoneCall, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenTracking: () => void;
  onOpenAbout: () => void;
  onNavigateProducts: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  onOpenCart,
  onOpenTracking,
  onOpenAbout,
  onNavigateProducts,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Top Notification Bar */}
      <div className="bg-[#0B1120] text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              طباعة DTF احترافية وتطريز عالي الدقة
            </span>
            <span className="hidden md:inline text-slate-500">|</span>
            <span className="hidden md:inline">التوصيل متوفر لـ 58 ولاية والدفع عند الاستلام</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={onOpenTracking}
              className="hover:text-blue-400 transition-colors flex items-center gap-1 underline underline-offset-4"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              تتبع طلبك
            </button>
            <span className="text-slate-500">|</span>
            <span className="flex items-center gap-1 dir-ltr font-sans text-slate-400">
              <PhoneCall className="w-3.5 h-3.5" />
              +213 (0) 550 00 00 00
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-xl text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              ZR
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                ZR <span className="text-blue-500 font-black">Factory</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium -mt-1 tracking-wider">
                نطبع، وأنتم تبيعون
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <a
              href="#"
              className="text-white hover:text-blue-400 transition-colors relative py-2 after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-full after:h-0.5 after:bg-blue-500"
            >
              الرئيسية
            </a>
            <button
              onClick={onNavigateProducts}
              className="text-slate-300 hover:text-blue-400 transition-colors py-2"
            >
              المنتجات والكتالوج
            </button>
            <button
              onClick={onOpenAbout}
              className="text-slate-300 hover:text-blue-400 transition-colors py-2"
            >
              من نحن
            </button>
            <button
              onClick={onOpenTracking}
              className="text-slate-300 hover:text-blue-400 transition-colors py-2 flex items-center gap-1"
            >
              <PackageCheck className="w-4 h-4 text-blue-400" />
              تتبع الطلب
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Quick Track Button (Desktop) */}
            <button
              onClick={onOpenTracking}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <PackageCheck className="w-4 h-4 text-blue-400" />
              تتبع طلبي
            </button>

            {/* Shopping Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/20 active:scale-95 flex items-center gap-2"
              aria-label="سلة المشتريات"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline text-xs font-bold">السلة</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 bg-amber-500 text-slate-950 font-black text-xs min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Hamburger Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="فتح القائمة"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900/98 px-4 pt-3 pb-6 space-y-3">
            <a
              href="#"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2.5 px-3 rounded-lg text-white font-medium bg-slate-800/60"
            >
              الرئيسية
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigateProducts();
              }}
              className="w-full text-right py-2.5 px-3 rounded-lg text-slate-300 hover:bg-slate-800 font-medium"
            >
              المنتجات والكتالوج
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAbout();
              }}
              className="w-full text-right py-2.5 px-3 rounded-lg text-slate-300 hover:bg-slate-800 font-medium"
            >
              من نحن
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTracking();
              }}
              className="w-full text-right py-2.5 px-3 rounded-lg text-slate-300 hover:bg-slate-800 font-medium flex items-center justify-between"
            >
              <span>تتبع الطلب</span>
              <PackageCheck className="w-4 h-4 text-blue-400" />
            </button>

            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigateProducts();
                }}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-center text-sm shadow-md"
              >
                تسوق الآن
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenTracking();
                }}
                className="flex-1 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 font-bold text-center text-sm"
              >
                تتبع الشحنة
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
