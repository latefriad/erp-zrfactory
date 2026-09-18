export enum CarrierName {
  YALIDINE = 'YALIDINE',
  ELOGISTIA = 'ELOGISTIA',
  ZR_EXPRESS = 'ZR_EXPRESS',
  ECOM_DELIVERY = 'ECOM_DELIVERY',
  ZR_DISPATCH = 'ZR_DISPATCH',
  MAYSTRO = 'MAYSTRO',
  KAZITOUR = 'KAZITOUR',
  SANDBOX = 'SANDBOX',
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

export interface CourierConfiguration {
  id: string;
  courierKey: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  credentials: Record<string, string>;
  fromWilaya: number;
  defaultDeliveryType: 'home' | 'stopdesk';
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DzshipTrackingEvent {
  status: string;
  rawStatus?: string;
  timestamp?: string;
  raw?: any;
}

export interface DzshipTrackingResult {
  trackingNumber: string;
  status: string;
  courier?: string;
  events: DzshipTrackingEvent[];
  raw?: any;
}

export interface DzshipDispatchResult {
  orderId: string;
  orderNumber: string;
  trackingNumber: string;
  courier: string;
  courierName: string;
  status: string;
  courierReference?: string;
  labelUrl?: string;
}
