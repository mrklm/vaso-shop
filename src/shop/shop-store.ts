import { create } from "zustand";
import { computeVaseEnvelopeMm } from "../engine/printer-volume";
import type { VaseParameters } from "../engine/types";
import { useVaseStore } from "../store/vase-store";
import { PLA_COLORS } from "./shop-colors";
import type { ShopVaseEntry } from "./shop-types";

const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

function cloneParams(params: VaseParameters): VaseParameters {
  return JSON.parse(JSON.stringify(params)) as VaseParameters;
}

function createEntryFromCurrentVase(): ShopVaseEntry {
  const { params, seed } = useVaseStore.getState();
  const clonedParams = cloneParams(params);
  const envelope = computeVaseEnvelopeMm(clonedParams);

  return {
    id: `${APP_VERSION}-${seed}-${Date.now()}`,
    seed,
    version: APP_VERSION,
    heightMm: clonedParams.heightMm,
    maxDiameterMm: Math.round(Math.max(envelope.width, envelope.depth)),
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

function getDefaultColorId(): string {
  return PLA_COLORS.find((color) => color.available)?.id ?? "";
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
  closeOrder: () => void;
  setSelectedColorId: (colorId: string) => void;
}

const initialEntry = createEntryFromCurrentVase();

export const useShopStore = create<ShopState>((set, get) => ({
  entries: [initialEntry],
  currentIndex: 0,
  selectedEntryId: null,
  selectedColorId: getDefaultColorId(),

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
      selectedColorId: getDefaultColorId(),
    });
  },

  closeOrder: () => set({ selectedEntryId: null }),

  setSelectedColorId: (colorId) => set({ selectedColorId: colorId }),
}));
