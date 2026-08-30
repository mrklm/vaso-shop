import { create } from "zustand";
import { analyzeWaterproofInsertCompatibility } from "../engine/insert-compatibility";
import { computeVaseEnvelopeMm } from "../engine/printer-volume";
import { generateOuterProfilePoints } from "../engine/mesh-builder";
import type { VaseParameters } from "../engine/types";
import { useVaseStore } from "../store/vase-store";
import type { ShopVaseEntry } from "./shop-types";

const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

function cloneParams(params: VaseParameters): VaseParameters {
  return JSON.parse(JSON.stringify(params)) as VaseParameters;
}

function createEntryFromCurrentVase(): ShopVaseEntry {
  const { params, seed } = useVaseStore.getState();
  const clonedParams = cloneParams(params);
  const envelope = computeVaseEnvelopeMm(clonedParams);
  const { diameterValues } = generateOuterProfilePoints(clonedParams);
  let minDiameterMm = Number.POSITIVE_INFINITY;
  for (let i = 0; i < diameterValues.length; i++) {
    minDiameterMm = Math.min(minDiameterMm, diameterValues[i]);
  }

  return {
    id: `${APP_VERSION}-${seed}-${Date.now()}`,
    seed,
    isSeedModified: false,
    version: APP_VERSION,
    heightMm: clonedParams.heightMm,
    minDiameterMm: Number.isFinite(minDiameterMm) ? Math.round(minDiameterMm) : 0,
    maxDiameterMm: Math.round(Math.max(envelope.width, envelope.depth)),
    waterproofInsertCompatibility: analyzeWaterproofInsertCompatibility(clonedParams),
    material: "PLA",
    params: clonedParams,
  };
}

function applyEntryToVaseStore(entry: ShopVaseEntry) {
  useVaseStore.setState((state) => ({
    ...state,
    seed: entry.seed,
    params: cloneParams(entry.params),
    isSeedModified: false,
  }));
}

interface ShopState {
  entries: ShopVaseEntry[];
  currentIndex: number;
  selectedEntryId: string | null;
  selectedColorId: string;
  generateNext: () => void;
  goPrevious: () => void;
  goNext: () => void;
  openOrderForCurrent: () => void;
  openOrderForEntry: (entry: ShopVaseEntry, colorId?: string) => void;
  closeOrder: () => void;
  setSelectedColorId: (colorId: string) => void;
}

const initialEntry = createEntryFromCurrentVase();

export const useShopStore = create<ShopState>((set, get) => ({
  entries: [initialEntry],
  currentIndex: 0,
  selectedEntryId: null,
  selectedColorId: "",

  generateNext: () => {
    useVaseStore.getState().randomize();
    const nextEntry = createEntryFromCurrentVase();
    const { currentIndex, entries } = get();
    const baseEntries = entries.slice(0, currentIndex + 1);

    set({
      entries: [...baseEntries, nextEntry],
      currentIndex: baseEntries.length,
      selectedEntryId: null,
    });
  },

  goPrevious: () => {
    const { currentIndex, entries } = get();
    if (currentIndex <= 0) return;

    const nextIndex = currentIndex - 1;
    applyEntryToVaseStore(entries[nextIndex]);
    set({ currentIndex: nextIndex, selectedEntryId: null });
  },

  goNext: () => {
    const { currentIndex, entries } = get();
    if (currentIndex >= entries.length - 1) return;

    const nextIndex = currentIndex + 1;
    applyEntryToVaseStore(entries[nextIndex]);
    set({ currentIndex: nextIndex, selectedEntryId: null });
  },

  openOrderForCurrent: () => {
    const { currentIndex, entries } = get();
    set({
      selectedEntryId: entries[currentIndex]?.id ?? null,
      selectedColorId: "",
    });
  },

  openOrderForEntry: (entry, colorId = "") => {
    const { entries } = get();
    const existingEntryIndex = entries.findIndex((currentEntry) => currentEntry.id === entry.id);
    const nextEntries =
      existingEntryIndex === -1
        ? [...entries, { ...entry, params: cloneParams(entry.params) }]
        : entries;
    const nextIndex = existingEntryIndex === -1 ? nextEntries.length - 1 : existingEntryIndex;

    applyEntryToVaseStore(nextEntries[nextIndex]);
    set({
      entries: nextEntries,
      currentIndex: nextIndex,
      selectedEntryId: nextEntries[nextIndex]?.id ?? null,
      selectedColorId: colorId,
    });
  },

  closeOrder: () => set({ selectedEntryId: null }),

  setSelectedColorId: (colorId) => set({ selectedColorId: colorId }),
}));
