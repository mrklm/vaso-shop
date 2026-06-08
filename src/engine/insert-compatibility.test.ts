import { describe, expect, it } from "vitest";
import { analyzeWaterproofInsertCompatibility } from "./insert-compatibility";
import { createProfile, defaultVaseParameters, type VaseParameters } from "./types";

function createTwoProfileVase(
  heightMm: number,
  bottomOuterDiameterMm: number,
  topOuterDiameterMm: number,
): VaseParameters {
  const params = defaultVaseParameters();
  params.heightMm = heightMm;
  params.wallThicknessMm = 2.4;
  params.bottomThicknessMm = 3;
  params.radialSamples = 96;
  params.profiles = [
    createProfile({ zRatio: 0, diameter: bottomOuterDiameterMm, sides: 64, rotationDeg: 0 }),
    createProfile({ zRatio: 1, diameter: topOuterDiameterMm, sides: 64, rotationDeg: 0 }),
  ];
  return params;
}

describe("analyzeWaterproofInsertCompatibility", () => {
  it("returns Eco-Cup 50 cl for a tall and wide profile", () => {
    const params = createTwoProfileVase(180, 74, 96);
    expect(analyzeWaterproofInsertCompatibility(params).label).toBe("Eco-Cup 50 cl");
  });

  it("returns Eco-Cup 25 cl for a medium profile", () => {
    const params = createTwoProfileVase(145, 66, 84);
    expect(analyzeWaterproofInsertCompatibility(params).label).toBe("Eco-Cup 25 cl");
  });

  it("returns Eco-Cup 12,5 cl for a narrower compatible profile", () => {
    const params = createTwoProfileVase(112, 62, 74);
    expect(analyzeWaterproofInsertCompatibility(params).label).toBe("Eco-Cup 12,5 cl");
  });

  it("falls back to Tube à essai when the neck is too narrow for cups", () => {
    const params = createTwoProfileVase(120, 40, 30);
    expect(analyzeWaterproofInsertCompatibility(params).label).toBe("Tube à essai 75 × 12 mm");
  });

  it("accepts a profile just above the 12,5 cl dimensions with margin", () => {
    const params = createTwoProfileVase(101.2, 57.9, 71.9);
    expect(analyzeWaterproofInsertCompatibility(params).label).toBe("Eco-Cup 12,5 cl");
  });

  it("falls back to a smaller insert just below the 12,5 cl dimensions with margin", () => {
    const params = createTwoProfileVase(100.8, 57.6, 71.5);
    expect(analyzeWaterproofInsertCompatibility(params).label).toBe("Tube à essai 75 × 12 mm");
  });
});
