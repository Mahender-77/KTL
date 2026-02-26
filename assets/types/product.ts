// assets/types/product.ts

export interface Variant {
  _id?: string;
  type: "weight" | "pieces" | "box";
  value: number;
  unit: "g" | "kg" | "ml" | "l" | "pcs" | "box";
  price: number;
  offerPrice?: number;
  sku?: string;
}

export interface StockByStoreVariant {
  store: string;
  variant: string;
  availableStock: number;
}

export interface Product {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  category: string | { _id: string; name: string; slug: string };
  images: string[];
  pricingMode: "fixed" | "custom-weight" | "unit";
  baseUnit: string;
  pricePerUnit: number;
  hasExpiry: boolean;
  shelfLifeDays?: number | null;
  nearestExpiry?: string | Date | null;
  variants?: Variant[];
  availableQuantity: number;
  stockByStoreVariant?: StockByStoreVariant[];
  isActive?: boolean;
  tags?: string[];
  taxRate?: number | null;
  minOrderQty?: number | null;
  maxOrderQty?: number | null;
}