export enum CostComponentType {
  BASE_ITEM = 'BASE_ITEM',       // e.g. T-shirt (700 DA)
  PRINTING = 'PRINTING',         // e.g. DTF (400 DA)
  PACKAGING = 'PACKAGING',       // e.g. Packaging (50 DA)
  LABOR = 'LABOR',
  SHIPPING = 'SHIPPING',
  OTHER = 'OTHER'
}

export interface CostComponent {
  id?: string;
  productId: string;
  name: string;
  type: CostComponentType;
  cost: number;
  isConfigurable: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string; // e.g. Size M / Black
  sku: string;
  additionalCost: number;
  additionalPrice: number;
  stockQuantity: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  baseCost: number;
  sellingPrice: number;
  compareAtPrice?: number;
  imageUrl?: string | null;
  images?: string[];
  features?: string[];
  hasBundleOffers?: boolean;
  bundleDiscounts?: {
    discount2?: number;
    discount3?: number;
  };
  grossProfit: number; // sellingPrice - totalCost
  costComponents?: CostComponent[];
  variants?: ProductVariant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  unit: string; // e.g. 'piece', 'meter', 'gram'
  unitCost: number;
  stockQuantity: number;
  reorderPoint: number;
  supplierId?: string | null;
  createdAt: string;
  updatedAt: string;
}
