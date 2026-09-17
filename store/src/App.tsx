import React, { useState, useEffect } from 'react';
import { Product, CartItem } from './types/store';
import { storeApi } from './services/storeApi';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ServicesGrid } from './components/ServicesGrid';
import { WhyChooseUs } from './components/WhyChooseUs';
import { HowItWorks } from './components/HowItWorks';
import { ProductCatalog } from './components/ProductCatalog';
import { ProductLandingPage } from './pages/ProductLandingPage';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { AboutModal } from './components/AboutModal';
import { Footer } from './components/Footer';

const CART_STORAGE_KEY = 'zr_store_cart_v1';

export const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(() => storeApi.getInitialProducts());
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Cart state persisted to localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dedicated Product Landing Page state
  const [landingProduct, setLandingProduct] = useState<Product | null>(null);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState<boolean>(false);
  const [trackingQuery, setTrackingQuery] = useState<string>('');
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  // Check URL query parameters for direct product landing link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prodId = params.get('product') || params.get('p');
    if (prodId) {
      const found = products.find(p => p.id === prodId);
      if (found) {
        setLandingProduct(found);
      }
    }
  }, [products]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const prodId = params.get('product') || params.get('p');
      if (prodId) {
        const found = products.find(p => p.id === prodId);
        if (found) {
          setLandingProduct(found);
          return;
        }
      }
      setLandingProduct(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products]);

  // Save cart changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  const fetchProducts = async () => {
    try {
      const list = await storeApi.getProducts();
      if (list && list.length > 0) {
        setProducts(list);
        setLoadError(null);
      }
    } catch (err: any) {
      console.warn('[ZR Store] Using fallback catalog:', err);
    }
  };

  // Load live products on mount in background
  useEffect(() => {
    fetchProducts();
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

  const openProductLanding = (product: Product) => {
    setLandingProduct(product);
    window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('product', product.id);
      window.history.pushState({}, '', url.toString());
    } catch {}
  };

  const closeProductLanding = () => {
    setLandingProduct(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('product');
      url.searchParams.delete('p');
      window.history.pushState({}, '', url.toString());
    } catch {}
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
    if (landingProduct) {
      closeProductLanding();
    }
    setTimeout(() => {
      const el = document.getElementById('products');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
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
        {landingProduct ? (
          <ProductLandingPage
            product={landingProduct}
            onBack={closeProductLanding}
            onOrderSuccess={handleOrderSuccess}
          />
        ) : (
          <>
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
              error={loadError}
              onRetry={fetchProducts}
              onSelectProduct={product => openProductLanding(product)}
              onQuickAdd={product => openProductLanding(product)}
            />

            <HowItWorks />
          </>
        )}
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
