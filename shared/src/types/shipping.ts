export enum CarrierName {
  YALIDINE = 'YALIDINE',
  ZR_DISPATCH = 'ZR_DISPATCH',
  MAYSTRO = 'MAYSTRO',
  KAZITOUR = 'KAZITOUR',
  OTHER = 'OTHER'
}

export enum DeliveryType {
  DOMICILE = 'DOMICILE',
  STOP_DESK = 'STOP_DESK'
}

export enum ManifestStatus {
  DRAFT = 'DRAFT',
  DISPATCHED = 'DISPATCHED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface ShippingOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingWilaya: string;
  shippingCommune: string;
  shippingAddress?: string | null;
  deliveryType: DeliveryType | string;
  trackingNumber?: string | null;
  deliveryCompany?: string | null;
  total: number;
  status: string;
  paymentStatus: string;
  itemsCount?: number;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  returnedAt?: string | null;
  returnReason?: string | null;
  codRemittedAt?: string | null;
  createdAt: string;
}

export interface ShippingManifest {
  id: string;
  manifestNumber: string;
  carrier: CarrierName | string;
  driverName?: string | null;
  driverPhone?: string | null;
  vehiclePlate?: string | null;
  totalParcels: number;
  totalCodAmount: number;
  status: ManifestStatus;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  dispatchedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  orders?: ShippingOrderSummary[];
}

export interface ShippingRateZone {
  id: string;
  wilayaCode: number;
  wilayaName: string;
  zoneNumber: number;
  feeDomicile: number;
  feeStopDesk: number;
  isActive: boolean;
  updatedAt: string;
}

export interface ShippingMetrics {
  inTransitCount: number;
  deliveredCount: number;
  returnedCount: number;
  pendingCodAmount: number;
  remittedCodAmount: number;
  deliverySuccessRate: number;
  returnRate: number;
  activeManifestsCount: number;
}
