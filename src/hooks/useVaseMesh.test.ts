import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useVaseMesh } from "./useVaseMesh";
import type { VaseParameters, MeshData } from "../engine/types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("cancels obsolete calculations and ignores their late results", () => {
  const workers: FakeWorker[] = [];
  class FakeWorker {
    onmessage: ((event: { data: { mesh: MeshData } }) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();
    constructor() {
      workers.push(this);
    }
  }
  vi.stubGlobal("Worker", FakeWorker);
  const params = { heightMm: 100 } as VaseParameters;
  const mesh = { vertices: new Float32Array(9), indices: new Uint32Array(3) };
  const { result, rerender, unmount } = renderHook(({ seed }) => useVaseMesh(params, seed), {
    initialProps: { seed: 1 },
  });
  expect(result.current).toBeNull();
  rerender({ seed: 2 });
  expect(workers[0].terminate).toHaveBeenCalled();
  act(() => workers[0].onmessage?.({ data: { mesh } }));
  expect(result.current).toBeNull();
  act(() => workers[1].onmessage?.({ data: { mesh } }));
  expect(result.current).toBe(mesh);
  expect(workers[1].terminate).toHaveBeenCalled();
  unmount();
});
