import { Product, StoreOrderPayload, OrderTrackingInfo } from '../types/store';

const DEFAULT_PROD_API = 'https://erp-zrfactory.onrender.com';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : DEFAULT_PROD_API;

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

async function fetchWithRetry(url: string, options?: RequestInit, retries = 2, delay = 1500): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (i === retries) return res;
    } catch (err) {
      if (i === retries) throw err;
    }
    await new Promise(r => setTimeout(r, delay));
  }
  return fetch(url, options);
}

export const storeApi = {
  async getProducts(search?: string): Promise<Product[]> {
    const url = new URL('/api/products', API_BASE);
    url.searchParams.set('isActive', 'true');
    if (search) {
      url.searchParams.set('search', search);
    }

    try {
      const res = await fetchWithRetry(url.toString(), undefined, 2, 1500);
      if (!res.ok) {
        throw new Error(`Erreur de chargement des produits (${res.status})`);
      }
      const json = await res.json();
      return json.data?.products || [];
    } catch (err) {
      console.error('[ZR Store] Failed to fetch products:', err);
      throw err;
    }
  },

  async getProductById(id: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/api/products/${id}`);
    if (!res.ok) {
      throw new Error(`Produit introuvable (${res.status})`);
    }
    const json = await res.json();
    return json.data?.product;
  },

  async createStoreOrder(payload: StoreOrderPayload): Promise<any> {
    const res = await fetch(`${API_BASE}/api/orders/store-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Erreur lors de la création de la commande');
    }
    return json.data.order;
  },

  async trackOrder(query: string): Promise<OrderTrackingInfo> {
    const res = await fetch(`${API_BASE}/api/orders/track/${encodeURIComponent(query.trim())}`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Aucune commande trouvée');
    }
    return json.data.tracking;
  },
};
