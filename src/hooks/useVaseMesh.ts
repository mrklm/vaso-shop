import { useEffect, useState } from "react";
import type { VaseParameters, MeshData } from "../engine/types";

/** Compute preview geometry off the UI thread; cancel obsolete calculations. */
export function useVaseMesh(
  params: VaseParameters,
  seed: number,
  forceTestTubeSupport = false,
  suppressTestTubeSupport = false,
): MeshData | null {
  const requestKey = JSON.stringify({
    params,
    seed,
    forceTestTubeSupport,
    suppressTestTubeSupport,
  });
  const [result, setResult] = useState<{ key: string; mesh: MeshData } | null>(null);
  useEffect(() => {
    let worker: Worker;
    let cancelled = false;
    try {
      worker = new Worker(new URL("./vase-mesh.worker.ts", import.meta.url), { type: "module" });
    } catch (error) {
      console.warn("Mesh worker could not start:", error);
      return;
    }
    worker.onmessage = (event: MessageEvent<{ mesh?: MeshData; error?: string }>) => {
      if (cancelled) return;
      if (event.data.mesh) setResult({ key: requestKey, mesh: event.data.mesh });
      else console.warn("Mesh generation failed:", event.data.error);
      worker.terminate();
    };
    worker.onerror = (error) => {
      console.warn("Mesh worker failed:", error.message);
      worker.terminate();
    };
    worker.postMessage(JSON.parse(requestKey));
    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, [requestKey]);
  return result?.key === requestKey ? result.mesh : null;
}
