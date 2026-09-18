import { Product, StoreOrderPayload, OrderTrackingInfo } from '../types/store';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

const DEFAULT_PROD_API = 'https://erp-zrfactory.onrender.com';

const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

function getEndpoints(pathWithQuery: string): string[] {
  const cleanPath = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  const customUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : null;

  if (customUrl) {
    return [`${customUrl}${cleanPath}`, `${DEFAULT_PROD_API}${cleanPath}`];
  }

  if (isLocal) {
    return [
      cleanPath,
      `http://localhost:5000${cleanPath}`,
      `${DEFAULT_PROD_API}${cleanPath}`
    ];
  }

  return [
    `${DEFAULT_PROD_API}${cleanPath}`,
    cleanPath
  ];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const CACHE_KEY = 'zr_store_products_cache_v3';

export const storeApi = {
  getInitialProducts(): Product[] {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_PRODUCTS;
  },

  async getProducts(search?: string): Promise<Product[]> {
    const query = `isActive=true${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    const endpoints = getEndpoints(`/api/products?${query}`);

    let lastError: any = null;

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            if (json.success && Array.isArray(json.data?.products) && json.data.products.length > 0) {
              const liveProducts: Product[] = json.data.products;
              try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(liveProducts));
              } catch {}
              return liveProducts;
            }
          } catch {
            // received non-JSON (e.g. HTML fallback)
          }
        }
      } catch (err) {
        lastError = err;
      }
    }

    // Graceful fallback to initial or cached products
    console.warn('[ZR Store] Live API unreachable, using catalog fallback', lastError);
    const fallback = this.getInitialProducts();
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      return fallback.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    }
    return fallback;
  },

  async getProductById(id: string): Promise<Product> {
    const endpoints = getEndpoints(`/api/products/${id}`);
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.product) return json.data.product;
        }
      } catch {}
    }
    const fallback = this.getInitialProducts().find(p => p.id === id);
    if (fallback) return fallback;
    throw new Error('Produit introuvable');
  },

  async createStoreOrder(payload: StoreOrderPayload): Promise<any> {
    const endpoints = getEndpoints(`/api/orders/store-order`);
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const text = await res.text();
        const json = JSON.parse(text);
        if (res.ok && json.success) {
          return json.data.order;
        }
        if (json.message) {
          throw new Error(json.message);
        }
      } catch (err: any) {
        lastError = err;
        if (err?.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError') && err.name !== 'TypeError' && err.name !== 'AbortError') {
          throw err;
        }
      }
    }
    throw lastError || new Error('Erreur lors de la création de la commande');
  },

  async trackOrder(query: string): Promise<OrderTrackingInfo> {
    const endpoints = getEndpoints(`/api/orders/track/${encodeURIComponent(query.trim())}`);
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint);
        const json = await res.json();
        if (res.ok && json.success) {
          return json.data.tracking;
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('Aucune commande trouvée');
  },
};
