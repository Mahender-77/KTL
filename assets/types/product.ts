// assets/types/product.ts
// ✅ Single source of truth — import from here everywhere

export type Variant = {
  _id?: string;
  type: "weight" | "pieces" | "box";
  value: number;
  unit: "g" | "kg" | "ml" | "l" | "pcs" | "box";
  price: number;
  offerPrice?: number;
  sku?: string;
};

export type Product = {
  _id: string;
  name: string;
  description?: string;
  images: string[];
  variants: Variant[];
  category?: string;    // used for fetching similar products
};