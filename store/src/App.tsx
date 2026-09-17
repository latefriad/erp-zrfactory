import React, { useState, useEffect } from 'react';
import { Product } from '@zr-erp/shared';
import { CartItem } from './types/store';
import { storeApi } from './services/storeApi';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ServicesGrid } from './components/ServicesGrid';
import { WhyChooseUs } from './components/WhyChooseUs';
import { HowItWorks } from './components/HowItWorks';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { AboutModal } from './components/AboutModal';
import { Footer } from './components/Footer';

const CART_STORAGE_KEY = 'zr_store_cart_v1';

export const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);

  // Cart state persisted to localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState<boolean>(false);
  const [trackingQuery, setTrackingQuery] = useState<string>('');
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  // Save cart changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  // Load products on mount
  useEffect(() => {
    async function loadProducts() {
      setLoadingProducts(true);
      try {
        const list = await storeApi.getProducts();
        setProducts(list);
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  const totalCartCount = cart.reduce((sum, itm) => sum + itm.quantity, 0);

  const handleAddToCart = (item: CartItem) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(i => i.id === item.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += item.quantity;
        return copy;
      }
      return [...prev, item];
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(itm => {
          if (itm.id === id) {
            const newQty = itm.quantity + delta;
            return newQty > 0 ? { ...itm, quantity: newQty } : null;
          }
          return itm;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleOrderSuccess = (order: any) => {
    setCart([]);
    setIsCheckoutOpen(false);
    setSuccessOrder(order);
  };

  const handleTrackOrderFromSuccess = (orderNumber: string) => {
    setSuccessOrder(null);
    setTrackingQuery(orderNumber);
    setIsTrackingOpen(true);
  };

  const scrollToProducts = () => {
    const el = document.getElementById('products');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <Header
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => {
          setTrackingQuery('');
          setIsTrackingOpen(true);
        }}
        onOpenAbout={() => setIsAboutOpen(true)}
        onNavigateProducts={scrollToProducts}
      />

      {/* Main Content */}
      <main className="flex-1">
        <Hero
          onShopClick={scrollToProducts}
          onTrackClick={() => {
            setTrackingQuery('');
            setIsTrackingOpen(true);
          }}
        />

        <ServicesGrid />

        <WhyChooseUs />

        <ProductCatalog
          products={products}
          loading={loadingProducts}
          onSelectProduct={product => setSelectedProduct(product)}
          onQuickAdd={product => setSelectedProduct(product)}
        />

        <HowItWorks />
      </main>

      {/* Footer */}
      <Footer
        onOpenTracking={() => {
          setTrackingQuery('');
          setIsTrackingOpen(true);
        }}
        onOpenAbout={() => setIsAboutOpen(true)}
        onNavigateProducts={scrollToProducts}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onProceedCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        onOrderSuccess={handleOrderSuccess}
      />

      <OrderSuccessModal
        order={successOrder}
        onClose={() => setSuccessOrder(null)}
        onTrackOrder={handleTrackOrderFromSuccess}
      />

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        initialQuery={trackingQuery}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onBrowseProducts={scrollToProducts}
      />
    </div>
  );
};
