import { generateVaseMesh } from "../engine/mesh-builder";
import type { VaseParameters } from "../engine/types";

self.onmessage = (
  event: MessageEvent<{
    params: VaseParameters;
    forceTestTubeSupport: boolean;
    suppressTestTubeSupport: boolean;
  }>,
) => {
  try {
    const { params, forceTestTubeSupport, suppressTestTubeSupport } = event.data;
    const mesh = generateVaseMesh(
      {
        ...params,
        radialSamples: Math.min(params.radialSamples, 72),
        verticalSamples: Math.min(params.verticalSamples, 96),
      },
      { forceTestTubeSupport, suppressTestTubeSupport },
    );
    self.postMessage({ mesh }, { transfer: [mesh.vertices.buffer, mesh.indices.buffer] });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
