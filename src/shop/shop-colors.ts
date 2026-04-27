export interface ShopColor {
  id: string;
  label: string;
  hex: string;
  available: boolean;
}

export const PLA_COLORS: ShopColor[] = [
  { id: "black", label: "Noir mat", hex: "#111111", available: true },
  { id: "white", label: "Blanc mat", hex: "#f2f2f2", available: true },
  { id: "blue", label: "Bleu VASO", hex: "#2b6cff", available: true },
];
