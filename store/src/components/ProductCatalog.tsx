import React, { useState, useMemo } from 'react';
import { Product } from '../types/store';
import { Search, ShoppingBag, ArrowLeft, Tag, Layers, Check, Sparkles } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  loading: boolean;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  loading,
  onSelectProduct,
  onQuickAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [products, searchTerm]);

  return (
    <section id="products" className="py-16 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-slate-200">
          <div>
            <span className="inline-flex items-center gap-1.5 text-blue-600 font-bold text-xs uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              <Sparkles className="w-3.5 h-3.5" />
              الكتالوج والمخزون المباشر
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              منتجاتنا المميزة للطباعة حسب الطلب
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              جميع المنتجات جاهزة للطباعة والتخصيص الفوري والشحن لجميع الولايات
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث عن منتج أو كود..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-slate-800 placeholder-slate-400 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                مسح
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm animate-pulse space-y-4"
              >
                <div className="aspect-[4/3] bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
                <div className="h-8 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProducts.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">لا توجد منتجات مطابقة</h3>
            <p className="text-slate-500 text-sm mb-4">
              {searchTerm
                ? `لم نعثر على أي منتج يطابق البحث "${searchTerm}". جرب البحث بكلمات أخرى.`
                : 'يتم حالياً تحديث الكتالوج من لوحة تحكم ERP، يرجى المحاولة لاحقاً.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors"
              >
                عرض جميع المنتجات
              </button>
            )}
          </div>
        )}

        {/* Products Grid */}
        {!loading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => {
              const hasVariants = product.variants && product.variants.length > 0;
              const minPrice = product.sellingPrice;
              const hasDescription = product.description && product.description.trim().length > 0;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group"
                >
                  {/* Product Visual Box */}
                  <div
                    onClick={() => onSelectProduct(product)}
                    className="cursor-pointer relative aspect-[4/3] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6 overflow-hidden"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform duration-300">
                      <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                    </div>

                    {/* Badge */}
                    <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                      طباعة DTF
                    </div>

                    {/* Stock status indicator */}
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-emerald-950/80 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>متوفر للطلب</span>
                    </div>

                    <div className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-400 bg-slate-950/70 px-1.5 py-0.5 rounded">
                      {product.sku}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => onSelectProduct(product)}
                        className="cursor-pointer font-bold text-slate-900 text-base line-clamp-1 hover:text-blue-600 transition-colors"
                        title={product.name}
                      >
                        {product.name}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px]">
                        {hasDescription ? product.description : 'منتج قطني مخصص عالي الجودة جاهز للطباعة والتخصيص بالكامل.'}
                      </p>

                      {/* Variants Preview */}
                      {hasVariants && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">الخيارات:</span>
                          {product.variants!.slice(0, 4).map(v => (
                            <span
                              key={v.id}
                              className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-200"
                            >
                              {v.name}
                            </span>
                          ))}
                          {product.variants!.length > 4 && (
                            <span className="text-[10px] text-slate-400">
                              +{product.variants!.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Price & Add to Cart Action */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-400">السعر</span>
                        <span className="font-extrabold text-blue-600 text-lg">
                          {minPrice.toLocaleString('fr-DZ')} <span className="text-xs font-bold">د.ج</span>
                        </span>
                      </div>

                      <button
                        onClick={() => onSelectProduct(product)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5 active:scale-95 shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{hasVariants ? 'اختر واطلب' : 'أضف للسلة'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
