export interface IncomeStatement {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: number;
  cogs: {
    total: number;
    baseGarments: number;
    printingDtf: number;
    packaging: number;
    otherDirect: number;
  };
  grossProfit: number;
  grossMarginPercentage: number;
  operatingExpenses: {
    total: number;
    byCategory: {
      categoryId: string;
      categoryName: string;
      amount: number;
      percentage: number;
    }[];
  };
  netProfit: number;
  netMarginPercentage: number;
  metrics: {
    ordersCount: number;
    averageOrderValue: number;
    expensesCount: number;
  };
}

export interface BalanceSheet {
  asOfDate: string;
  assets: {
    cashAccounts: {
      id: string;
      name: string;
      type: string;
      balance: number;
    }[];
    totalCash: number;
    inventoryValuation: number;
    customerReceivables: number;
    totalAssets: number;
  };
  liabilitiesAndEquity: {
    partnerBalances: {
      id: string;
      name: string;
      ownershipPercentage: number;
      balance: number;
    }[];
    totalPartnerEquity: number;
    currentPeriodNetProfit: number;
    supplierPayables: number;
    totalLiabilitiesAndEquity: number;
  };
}

export interface ProductMarginReport {
  productId: string;
  productName: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercentage: number;
}
