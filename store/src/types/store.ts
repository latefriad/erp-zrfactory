export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  sellingPrice: number;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  notes?: string;
  imageUrl?: string;
}

export interface StoreOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingWilaya: string;
  shippingCommune?: string;
  shippingAddress?: string;
  deliveryOption?: 'HOME' | 'STOP_DESK';
  deliveryCompany?: string;
  deliveryFee?: number;
  notes?: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
    notes?: string;
  }>;
}

export interface TrackingItem {
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderTrackingInfo {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  shippingWilaya: string;
  shippingCommune: string;
  deliveryCompany: string;
  trackingNumber: string;
  total: number;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
  items: TrackingItem[];
}
