export enum ExpenseCategory {
  MATERIALS = 'MATERIALS',
  T_SHIRTS = 'T_SHIRTS',
  PRINTING = 'PRINTING',
  PACKAGING = 'PACKAGING',
  DELIVERY = 'DELIVERY',
  ADVERTISING = 'ADVERTISING',
  SOFTWARE = 'SOFTWARE',
  RENT = 'RENT',
  ELECTRICITY = 'ELECTRICITY',
  PHONE = 'PHONE',
  EQUIPMENT = 'EQUIPMENT',
  TAXES = 'TAXES',
  OTHER = 'OTHER'
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CCP = 'CCP',
  BARIDIMOB = 'BARIDIMOB',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER'
}

export interface Expense {
  id: string;
  categoryId: string;
  categoryName?: string;
  supplierId?: string | null;
  supplierName?: string | null;
  cashAccountId: string;
  cashAccountName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  date: string;
  description: string;
  attachment?: string | null;
  createdBy?: string;
  createdByName?: string;
  createdAt: string;
}
