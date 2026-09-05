import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, SSAO, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { VaseMesh } from "./VaseMesh";
import { useVaseStore } from "../../store/vase-store";
import { useUIStore } from "../../store/ui-store";
import { useVaseMesh } from "../../hooks/useVaseMesh";
import { usesLowPolyTexture } from "../../engine/textures";
import viewer3dOffIcon from "../../assets/shop/viewer-3d-off.png";
import viewer3dOnIcon from "../../assets/shop/viewer-3d-on.png";

const ROTATE_SPEED = 0.05;

function KeyboardControls({
  controlsRef,
  enabled,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  enabled: boolean;
}) {
  const { camera } = useThree();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!enabled) return;

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      const controls = controlsRef.current;
      if (!controls) return;

      switch (e.key) {
        case "ArrowLeft":
          camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), ROTATE_SPEED);
          controls.update();
          e.preventDefault();
          break;
        case "ArrowRight":
          camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -ROTATE_SPEED);
          controls.update();
          e.preventDefault();
          break;
        case "ArrowUp":
          camera.position.y = Math.min(400, camera.position.y + 5);
          controls.update();
          e.preventDefault();
          break;
        case "ArrowDown":
          camera.position.y = Math.max(-100, camera.position.y - 5);
          controls.update();
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [camera, controlsRef, enabled]);

  return null;
}

function ClippingPlane({ heightPercent, maxHeight }: { heightPercent: number; maxHeight: number }) {
  const { gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), []);

  useEffect(() => {
    // Z in our mesh = height. Clipping plane at the given percent of max height.
    // The mesh is centered, so we need to offset.
    plane.constant = (heightPercent / 100) * maxHeight - maxHeight / 2;
    gl.clippingPlanes = [plane];
    gl.localClippingEnabled = true;
    return () => {
      gl.clippingPlanes = [];
      gl.localClippingEnabled = false;
    };
  }, [heightPercent, maxHeight, gl, plane]);

  return null;
}

function Autoplay({
  controlsRef,
  paramsKey,
  rotationMode,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  paramsKey: string;
  rotationMode: "camera" | "vase";
}) {
  const autoRotate = useUIStore((s) => s.autoRotate);
  const setAutoRotate = useUIStore((s) => s.setAutoRotate);

  // Stop on user interaction
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const stop = () => setAutoRotate(false);

    const dom = controls.domElement as HTMLElement | undefined;
    if (!dom) return;
    dom.addEventListener("pointerdown", stop);
    dom.addEventListener("wheel", stop);
    dom.addEventListener("touchstart", stop);

    return () => {
      dom.removeEventListener("pointerdown", stop);
      dom.removeEventListener("wheel", stop);
      dom.removeEventListener("touchstart", stop);
    };
  }, [controlsRef, setAutoRotate]);

  // Restart rotation when params change (new vase generated)
  useEffect(() => {
    setAutoRotate(rotationMode === "camera");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, rotationMode]);

  useFrame(() => {
    if (!controlsRef.current) return;

    controlsRef.current.autoRotate = rotationMode === "camera" && autoRotate;
    controlsRef.current.autoRotateSpeed = 1.5;
  });

  return null;
}

function ScreenshotBridge() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const setCaptureViewerImage = useUIStore((s) => s.setCaptureViewerImage);

  useEffect(() => {
    const capture = async (): Promise<string | null> => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          gl.render(scene, camera);
          resolve();
        });
      });

      try {
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
    };

    setCaptureViewerImage(capture);
    return () => setCaptureViewerImage(null);
  }, [camera, gl, scene, setCaptureViewerImage]);

  return null;
}

interface VaseViewer3DProps {
  mode?: "main" | "preview";
  colorOverride?: string;
  colorOpacity?: number;
  colorEmissiveIntensity?: number;
  shadingOverride?: number;
  forceTestTubeSupport?: boolean;
  suppressTestTubeSupport?: boolean;
  captureToStore?: boolean;
}

export function VaseViewer3D({
  mode = "main",
  colorOverride,
  colorOpacity = 1,
  colorEmissiveIntensity = 0,
  shadingOverride,
  forceTestTubeSupport = false,
  suppressTestTubeSupport = false,
  captureToStore,
}: VaseViewer3DProps) {
  const params = useVaseStore((s) => s.params);
  const seed = useVaseStore((s) => s.seed);
  const randomize = useVaseStore((s) => s.randomize);
  const shading = useUIStore((s) => s.shading);
  const showGrid = useUIStore((s) => s.showGrid);
  const vaseColor = useUIStore((s) => s.vaseColor);
  const wireframe = useUIStore((s) => s.wireframe);
  const flatShading = useUIStore((s) => s.flatShading);
  const showClipping = useUIStore((s) => s.showClipping);
  const clippingHeight = useUIStore((s) => s.clippingHeight);
  const rotationMode = useUIStore((s) => s.rotationMode);
  const rotationSpeed = useUIStore((s) => s.rotationSpeed);
  const meshData = useVaseMesh(params, seed, forceTestTubeSupport, suppressTestTubeSupport);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const lastTapRef = useRef(0);
  const [interactionEnabled, setInteractionEnabled] = useState(false);
  const paramsKey = JSON.stringify(params);
  const isPreview = mode === "preview";
  const shouldCaptureToStore = captureToStore ?? !isPreview;
  const resolvedColor = colorOverride ?? vaseColor;
  const resolvedOpacity = Math.min(1, Math.max(0.08, colorOpacity));
  const resolvedEmissiveIntensity = Math.min(0.5, Math.max(0, colorEmissiveIntensity));
  const resolvedShading = Math.min(100, Math.max(0, shadingOverride ?? shading));
  const resolvedWireframe = isPreview ? false : wireframe;
  const resolvedFlatShading = flatShading || usesLowPolyTexture(params);
  const resolvedRotationMode = isPreview ? "vase" : rotationMode;
  const resolvedRotationSpeed = isPreview ? 0.35 : rotationSpeed;

  const handleDoubleTap = useCallback(
    (e: React.TouchEvent) => {
      const now = Date.now();
      if (now - lastTapRef.current < 350) {
        e.preventDefault();
        randomize();
      }
      lastTapRef.current = now;
    },
    [randomize],
  );

  return (
    <div
      className={`viewer-3d${isPreview ? " viewer-3d-preview" : ""}${
        !isPreview && interactionEnabled ? " viewer-3d-unlocked" : " viewer-3d-locked"
      }`}
      onTouchEnd={isPreview || !interactionEnabled ? undefined : handleDoubleTap}
    >
      {!isPreview && (
        <button
          className={`viewer-3d-interaction-toggle${
            interactionEnabled ? " viewer-3d-interaction-toggle-active" : ""
          }`}
          type="button"
          onClick={() => setInteractionEnabled((currentValue) => !currentValue)}
          aria-pressed={interactionEnabled}
          aria-label={
            interactionEnabled ? "Verrouiller la manipulation 3D" : "Activer la manipulation 3D"
          }
          title={
            interactionEnabled ? "Manipulation 3D active" : "Activer la rotation et le zoom 3D"
          }
        >
          <img
            className="viewer-3d-toggle-icon"
            src={interactionEnabled ? viewer3dOnIcon : viewer3dOffIcon}
            alt=""
            aria-hidden="true"
          />
        </button>
      )}
      <Canvas
        camera={{
          position: isPreview ? [175, 130, 175] : [220, 160, 220],
          fov: 45,
          near: 0.1,
          far: 2000,
        }}
        style={{ background: "var(--color-bg)" }}
        gl={{ preserveDrawingBuffer: true }}
        shadows={!isPreview}
      >
        <ambientLight intensity={isPreview ? 0.58 : 0.25} />
        <directionalLight
          position={[100, 200, 100]}
          intensity={isPreview ? 1.05 : 1.6}
          castShadow={!isPreview}
          shadow-bias={-0.0005}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={10}
          shadow-camera-far={500}
          shadow-camera-left={-200}
          shadow-camera-right={200}
          shadow-camera-top={200}
          shadow-camera-bottom={-200}
        />
        <directionalLight position={[-3, 4, -2]} intensity={isPreview ? 0.18 : 0.3} />
        <pointLight position={[0, 200, 0]} intensity={isPreview ? 0.16 : 0.3} />
        <hemisphereLight args={["#f5efe6", "#efe5d7", isPreview ? 0.62 : 0.3]} />

        {meshData && (
          <VaseMesh
            meshData={meshData}
            shading={resolvedShading}
            color={resolvedColor}
            opacity={resolvedOpacity}
            emissiveIntensity={resolvedEmissiveIntensity}
            wireframe={resolvedWireframe}
            flatShading={resolvedFlatShading}
            rotationMode={resolvedRotationMode}
            rotationSpeed={resolvedRotationSpeed}
          />
        )}

        {!isPreview && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -params.heightMm / 2 - 0.01, 0]}
            receiveShadow
          >
            <planeGeometry args={[600, 600]} />
            <shadowMaterial opacity={0.5} />
          </mesh>
        )}

        {/* <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={300} blur={2} far={200} /> */}

        {shouldCaptureToStore && <ScreenshotBridge />}

        {!isPreview && (
          <>
            <OrbitControls
              ref={controlsRef}
              enabled={interactionEnabled}
              enableDamping
              dampingFactor={0.1}
              minDistance={50}
              maxDistance={500}
            />
            <KeyboardControls controlsRef={controlsRef} enabled={interactionEnabled} />
            <Autoplay controlsRef={controlsRef} paramsKey={paramsKey} rotationMode={rotationMode} />
          </>
        )}

        {!isPreview && showClipping && (
          <ClippingPlane heightPercent={clippingHeight} maxHeight={params.heightMm} />
        )}
        {!isPreview && showGrid && (
          <gridHelper
            args={[300, 30, "#333333", "#333333"]}
            position={[0, -params.heightMm / 2, 0]}
          />
        )}

        {!isPreview && (
          <EffectComposer enableNormalPass>
            <SSAO radius={0.03} intensity={5} luminanceInfluence={0.3} />
            <ToneMapping mode={ToneMappingMode.AGX} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
