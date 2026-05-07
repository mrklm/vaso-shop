import { beforeEach, describe, expect, it } from "vitest";
import { PLA_COLORS } from "./shop-colors";
import { useShopStore } from "./shop-store";
import type { ShopVaseEntry } from "./shop-types";
import { useUIStore } from "../store/ui-store";
import { useVaseStore } from "../store/vase-store";

function cloneCurrentParams() {
  return JSON.parse(JSON.stringify(useVaseStore.getState().params));
}

function createEntry(id: string, seed: number, isSeedModified: boolean): ShopVaseEntry {
  const params = cloneCurrentParams();
  return {
    id,
    seed,
    isSeedModified,
    version: "test",
    heightMm: params.heightMm,
    minDiameterMm: 60,
    maxDiameterMm: 120,
    material: "PLA",
    params,
  };
}

describe("shopStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      ...useUIStore.getInitialState(),
      printerProfiles: [{ name: "Test Printer", width: 220, depth: 220, height: 180 }],
      activePrinterProfile: "Test Printer",
      enforcePrinterVolume: true,
    });
    useVaseStore.setState({
      ...useVaseStore.getInitialState(),
    });

    const defaultColorId = PLA_COLORS.find((color) => color.available)?.id ?? "";
    useShopStore.setState({
      entries: [
        createEntry("entry-1", 11111111, false),
        createEntry("entry-2", 22222222, true),
      ],
      currentIndex: 0,
      selectedEntryId: null,
      selectedColorId: defaultColorId,
    });
  });

  it("keeps shop entries on the canonical seed label when browsing history", () => {
    useShopStore.getState().goNext();
    expect(useVaseStore.getState().seed).toBe(22222222);
    expect(useVaseStore.getState().isSeedModified).toBe(false);

    useShopStore.getState().goPrevious();
    expect(useVaseStore.getState().seed).toBe(11111111);
    expect(useVaseStore.getState().isSeedModified).toBe(false);
  });
});
