import { useMemo } from "react";
import { generateOuterProfilePoints } from "../../engine/mesh-builder";
import { INSERT_PRESETS, type WaterproofInsertCompatibility } from "../../engine/insert-compatibility";
import type { VaseParameters } from "../../engine/types";

interface InsertView2DProps {
  params: VaseParameters;
  compatibility: WaterproofInsertCompatibility;
}

function formatInsertDimensions(
  preset: (typeof INSERT_PRESETS)[number],
): string {
  const bottomDiameter = preset.bottomDiameterMm ?? preset.topDiameterMm;
  if (preset.type === "test_tube") {
    return "Hauteur 75 mm · Ø 12 mm";
  }

  return `Hauteur ${preset.heightMm - 3} mm · Ø↑ ${preset.topDiameterMm - 3} mm · Ø↓ ${bottomDiameter - 3} mm`;
}

export function InsertView2D({ params, compatibility }: InsertView2DProps) {
  const insertData = useMemo(() => {
    try {
      const previewParams = {
        ...params,
        radialSamples: Math.min(params.radialSamples, 48),
        verticalSamples: Math.min(params.verticalSamples, 64),
      };
      const profileData = generateOuterProfilePoints(previewParams, 100);
      const preset = INSERT_PRESETS.find((entry) => entry.id === compatibility.presetId);
      if (!preset) {
        return null;
      }

      return { preset, profileData, params: previewParams };
    } catch {
      return null;
    }
  }, [compatibility.presetId, params]);

  if (!insertData) {
    return null;
  }

  const { preset, profileData } = insertData;
  const { zValues, radiusValues } = profileData;
  const maxR = Math.max(...Array.from(radiusValues)) * 1.1;
  const maxZ = params.heightMm;
  const width = 118;
  const height = 128;
  const margin = 12;
  const plotWidth = width - 2 * margin;
  const plotHeight = height - 2 * margin;

  let pathRight = "";
  let pathLeft = "";
  for (let index = 0; index < zValues.length; index++) {
    const x = margin + (radiusValues[index] / maxR) * (plotWidth / 2) + plotWidth / 2;
    const y = height - margin - (zValues[index] / maxZ) * plotHeight;
    const xMirror = margin + plotWidth / 2 - (radiusValues[index] / maxR) * (plotWidth / 2);
    pathRight += `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)} `;
    pathLeft += `${index === 0 ? "M" : "L"}${xMirror.toFixed(1)},${y.toFixed(1)} `;
  }

  const innerBottomZ = Math.min(params.bottomThicknessMm, params.heightMm);
  const insertBottomZ = innerBottomZ;
  const insertTopZ = Math.min(params.heightMm, innerBottomZ + preset.heightMm);
  const insertBottomRadius = (preset.bottomDiameterMm ?? preset.topDiameterMm) / 2;
  const insertTopRadius = preset.topDiameterMm / 2;
  const insertLeftBottomX = margin + plotWidth / 2 - (insertBottomRadius / maxR) * (plotWidth / 2);
  const insertRightBottomX = margin + plotWidth / 2 + (insertBottomRadius / maxR) * (plotWidth / 2);
  const insertLeftTopX = margin + plotWidth / 2 - (insertTopRadius / maxR) * (plotWidth / 2);
  const insertRightTopX = margin + plotWidth / 2 + (insertTopRadius / maxR) * (plotWidth / 2);
  const insertBottomY = height - margin - (insertBottomZ / maxZ) * plotHeight;
  const insertTopY = height - margin - (insertTopZ / maxZ) * plotHeight;
  const insertPath = [
    `M${insertLeftBottomX.toFixed(1)},${insertBottomY.toFixed(1)}`,
    `L${insertLeftTopX.toFixed(1)},${insertTopY.toFixed(1)}`,
    `L${insertRightTopX.toFixed(1)},${insertTopY.toFixed(1)}`,
    `L${insertRightBottomX.toFixed(1)},${insertBottomY.toFixed(1)}`,
    "Z",
  ].join(" ");

  return (
    <div className="shop-insert-view-card">
      <span className="shop-panel-title shop-insert-view-title">Contenant</span>
      <svg
        className="shop-insert-view-graphic"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-label={`Coupe du vase avec ${compatibility.label}`}
      >
        <path d={pathRight} fill="none" stroke="currentColor" strokeWidth="2" />
        <path d={pathLeft} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" />
        <path
          d={insertPath}
          fill="currentColor"
          fillOpacity="0.16"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <line
          x1={width / 2}
          y1={margin}
          x2={width / 2}
          y2={height - margin}
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.25"
          strokeDasharray="4,4"
        />
      </svg>
      <div className="shop-insert-view-caption">
        <strong>{compatibility.label}</strong>
        <span>{formatInsertDimensions(preset)}</span>
      </div>
    </div>
  );
}
