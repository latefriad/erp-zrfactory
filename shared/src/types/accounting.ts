export interface CashAccount {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'CCP' | 'BARIDIMOB';
  balance: number;
  currency: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum CashTransactionType {
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  EXPENSE = 'EXPENSE',
  PARTNER_CONTRIBUTION = 'PARTNER_CONTRIBUTION',
  PARTNER_WITHDRAWAL = 'PARTNER_WITHDRAWAL',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  ADJUSTMENT = 'ADJUSTMENT'
}

export interface CashTransaction {
  id: string;
  cashAccountId: string;
  type: CashTransactionType;
  amount: number; // positive for incoming, negative for outgoing
  balanceAfter: number;
  date: string;
  description: string;
  referenceId?: string | null; // orderId, expenseId, partnerTransactionId
  createdAt: string;
}

export interface AccountingPeriod {
  id: string;
  name: string; // e.g., '2026-09' or 'Q3 2026'
  startDate: string;
  endDate: string;
  isClosed: boolean;
  isDistributed: boolean;
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  grossProfit: number;
  netProfit: number;
  closedAt?: string | null;
  distributedAt?: string | null;
}

export interface ProfitDistribution {
  id: string;
  accountingPeriodId: string;
  partnerId: string;
  partnerName?: string;
  ownershipPercentage: number;
  profitShare: number;
  createdAt: string;
}
