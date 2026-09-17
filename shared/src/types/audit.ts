export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  REVERSE = 'REVERSE',
  RESTORE = 'RESTORE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  CONTRIBUTION = 'CONTRIBUTION',
  WITHDRAWAL = 'WITHDRAWAL',
  PROFIT_DISTRIBUTION = 'PROFIT_DISTRIBUTION'
}

export enum AuditEntityType {
  ORDER = 'ORDER',
  EXPENSE = 'EXPENSE',
  PARTNER = 'PARTNER',
  PARTNER_TRANSACTION = 'PARTNER_TRANSACTION',
  CASH_TRANSACTION = 'CASH_TRANSACTION',
  PRODUCT = 'PRODUCT',
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  USER = 'USER',
  SETTING = 'SETTING',
  BACKUP = 'BACKUP'
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  userName?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  oldValue?: string | null; // JSON string
  newValue?: string | null; // JSON string
  timestamp: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}
