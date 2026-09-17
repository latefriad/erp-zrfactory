export interface DashboardFinancials {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  cashBalance: number;
  currency: string;
}

export interface DashboardPartnerSummary {
  id: string;
  name: string;
  ownershipPercentage: number;
  initialCapital: number;
  currentBalance: number;
}

export interface DashboardOrdersSummary {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  printing: number;
  ready: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  returned: number;
}

export interface DashboardProductionSummary {
  activeItems: number;
  printingCount: number;
  pressCount: number;
  packedCount: number;
  defectRate: number;
  totalThroughput: number;
}

export interface DashboardShippingSummary {
  readyToShip: number;
  inTransit: number;
  delivered: number;
  returned: number;
  returnRate: number;
  pendingCodAmount: number;
}

export interface DashboardInventoryAlertItem {
  id: string;
  name: string;
  type: 'PRODUCT' | 'MATERIAL';
  currentStock: number;
  minimumStock: number;
  unit?: string;
}

export interface DashboardInventoryAlerts {
  lowStockProductsCount: number;
  lowStockMaterialsCount: number;
  items: DashboardInventoryAlertItem[];
}

export interface DashboardRecentActivity {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  entityType: string;
  targetId?: string;
  createdAt: string;
}

export interface DashboardSummary {
  financials: DashboardFinancials;
  partners: DashboardPartnerSummary[];
  orders: DashboardOrdersSummary;
  production: DashboardProductionSummary;
  shipping: DashboardShippingSummary;
  inventoryAlerts: DashboardInventoryAlerts;
  recentActivity: DashboardRecentActivity[];
}
