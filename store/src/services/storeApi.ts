import { Product, StoreOrderPayload, OrderTrackingInfo } from '../types/store';

const DEFAULT_PROD_API = 'https://erp-zrfactory.onrender.com';

const API_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? DEFAULT_PROD_API
      : '');

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const storeApi = {
  async getProducts(search?: string): Promise<Product[]> {
    const base = API_BASE || window.location.origin;
    const url = new URL('/api/products', base);
    url.searchParams.set('isActive', 'true');
    if (search) {
      url.searchParams.set('search', search);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Erreur de chargement des produits (${res.status})`);
    }
    const json = await res.json();
    return json.data?.products || [];
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
