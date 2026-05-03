import type { VaseParameters } from "../engine/types";

export interface ShopVaseEntry {
  id: string;
  seed: number;
  isSeedModified: boolean;
  version: string;
  heightMm: number;
  maxDiameterMm: number;
  material: "PLA";
  params: VaseParameters;
}
