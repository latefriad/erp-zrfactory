export enum PartnerTransactionType {
  CONTRIBUTION = 'CONTRIBUTION',
  WITHDRAWAL = 'WITHDRAWAL',
  PROFIT_DISTRIBUTION = 'PROFIT_DISTRIBUTION',
  ADJUSTMENT = 'ADJUSTMENT'
}

export interface Partner {
  id: string;
  name: string;
  ownershipPercentage: number; // e.g., 30 for 30%, 70 for 70%
  initialCapital: number;
  totalContributions: number;
  totalWithdrawals: number;
  totalProfitDistributed: number;
  currentBalance: number; // calculated: initialCapital + totalContributions + totalProfitDistributed - totalWithdrawals
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerTransaction {
  id: string;
  partnerId: string;
  partnerName?: string;
  type: PartnerTransactionType;
  amount: number;
  date: string;
  description: string;
  reference?: string | null;
  cashAccountId?: string | null;
  cashAccountName?: string | null;
  accountingPeriodId?: string | null;
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
}
