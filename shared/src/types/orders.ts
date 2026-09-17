export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  PRINTING = 'PRINTING',
  READY = 'READY',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED'
}

export interface OrderItem {
  id?: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  productName?: string;
  variantName?: string;
  sku?: string;
  quantity: number;
  sellingPrice: number;
  unitCost: number;
  totalCost: number;
  totalPrice: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  cost: number;
  profit: number;
  deliveryCompany?: string | null;
  trackingNumber?: string | null;
  shippingWilaya?: string | null;
  shippingCommune?: string | null;
  shippingAddress?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  itemsCount?: number;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    wilaya: string;
    commune: string;
    address?: string | null;
  };
}
