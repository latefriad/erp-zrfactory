export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  wilaya: string;
  commune: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile extends Customer {
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalSpent: number;
  lastOrderDate?: string | null;
  customerLifetimeValue: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  purchasesCount: number;
  totalPurchased: number;
  amountPaid: number;
  amountOwed: number;
  createdAt: string;
  updatedAt: string;
}
