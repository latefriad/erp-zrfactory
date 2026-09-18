export interface RecentStoreOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingWilaya: string;
  total: number;
  itemsCount: number;
  status: string;
  createdAt: string;
  customization?: string;
}

const STORAGE_KEY = 'zr_store_recent_orders_v1';
const MAX_ORDERS = 10;

export const recentOrdersService = {
  getRecentOrders(): RecentStoreOrder[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (e) {
      console.warn('[RecentOrders] Failed to parse stored orders', e);
      return [];
    }
  },

  getLatestOrder(): RecentStoreOrder | null {
    const list = this.getRecentOrders();
    return list.length > 0 ? list[0] : null;
  },

  saveRecentOrder(order: any): void {
    if (!order || !order.orderNumber) return;
    try {
      const current = this.getRecentOrders();
      // Remove any existing entry with same orderNumber or id
      const filtered = current.filter(
        o => o.orderNumber !== order.orderNumber && o.id !== order.id
      );

      const newEntry: RecentStoreOrder = {
        id: order.id || `ord-${Date.now()}`,
        orderNumber: order.orderNumber,
        customerName: order.customerName || 'الزبون',
        customerPhone: order.customerPhone || '',
        shippingWilaya: order.shippingWilaya || '',
        total: Number(order.total) || 0,
        itemsCount: order.itemsCount || (Array.isArray(order.items) ? order.items.length : 1),
        status: order.status || 'PENDING',
        createdAt: order.createdAt || new Date().toISOString(),
        customization: order.notes?.includes('تطريز') ? 'تطريز (Broderie)' : 'طباعة (DTF)',
      };

      const updated = [newEntry, ...filtered].slice(0, MAX_ORDERS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[RecentOrders] Failed to save recent order', e);
    }
  },

  removeRecentOrder(orderNumber: string): void {
    try {
      const current = this.getRecentOrders();
      const updated = current.filter(o => o.orderNumber !== orderNumber);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[RecentOrders] Failed to remove recent order', e);
    }
  },

  clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('[RecentOrders] Failed to clear recent orders', e);
    }
  }
};
