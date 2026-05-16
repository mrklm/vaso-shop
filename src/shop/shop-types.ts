import type { VaseParameters } from "../engine/types";
import type { WaterproofInsertCompatibility } from "../engine/insert-compatibility";

export interface ShopVaseEntry {
  id: string;
  seed: number;
  isSeedModified: boolean;
  version: string;
  heightMm: number;
  minDiameterMm: number;
  maxDiameterMm: number;
  waterproofInsertCompatibility: WaterproofInsertCompatibility;
  material: "PLA";
  params: VaseParameters;
}
