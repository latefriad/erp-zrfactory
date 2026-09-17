export enum ProductionStatus {
  PENDING_DESIGN = 'PENDING_DESIGN',
  READY_FOR_PRINT = 'READY_FOR_PRINT',
  PRINTING_DTF = 'PRINTING_DTF',
  HEAT_PRESS = 'HEAT_PRESS',
  QUALITY_CHECK = 'QUALITY_CHECK',
  PACKED = 'PACKED',
  READY_FOR_SHIPPING = 'READY_FOR_SHIPPING',
}

export interface ProductionItem {
  id: string;
  orderId: string;
  orderItemId: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  wilayaName?: string;
  productName: string;
  variantName?: string;
  garmentColor?: string;
  size?: string;
  quantity: number;
  dtfFormat?: string;
  status: ProductionStatus;
  assignedOperatorId?: string | null;
  assignedOperatorName?: string | null;
  operatorNotes?: string | null;
  defectCount: number;
  defectReason?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionMetrics {
  totalActive: number;
  inPrint: number;
  inPress: number;
  inQualityCheck: number;
  completedToday: number;
  defectRate: number;
  totalDefects: number;
}
