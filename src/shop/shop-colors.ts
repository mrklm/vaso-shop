import shopColorsData from "./shop-colors.json";

export interface ShopColor {
  id: string;
  label: string;
  hex: string;
  available: boolean;
}

export const PLA_COLORS = shopColorsData as ShopColor[];
