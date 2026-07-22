// Types
export interface ShadeData {
  shadeId: string;
  name: string;
  hexColor: string;
  finish: "matte" | "satin" | "glossy" | "sheer";
  undertone: "warm" | "cool" | "neutral";
  colorFamily: string;
  occasion: string[];
  brands: BrandData[];
}

export interface BrandData {
  brandName: string;
  productName: string;
  price: number;
  currency: string;
  buyUrl: string;
  imageUrl: string;
}

export interface ColorMatchResult {
  shade: ShadeData;
  distance: number;
}

export interface BrandMatchResult {
  shade: ShadeData;
  distance: number;
  category: "near-identical" | "similar shade";
}
