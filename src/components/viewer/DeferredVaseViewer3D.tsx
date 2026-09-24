import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { VaseViewer3DProps } from "./VaseViewer3D";

const Viewer = lazy(() =>
  import("./VaseViewer3D").then((module) => ({ default: module.VaseViewer3D })),
);

export function DeferredVaseViewer3D({
  mobile,
  ...props
}: VaseViewer3DProps & { mobile: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasEnteredView, setHasEnteredView] = useState(!mobile);
  const [inView, setInView] = useState(!mobile);
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== "hidden");

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setHasEnteredView(true);
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (entry.isIntersecting) setHasEnteredView(true);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const placeholder = (
    <div className="shop-viewer-loading" role="status">
      Chargement de l’aperçu 3D…
    </div>
  );
  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {hasEnteredView || !mobile ? (
        <Suspense fallback={placeholder}>
          <Viewer {...props} mobileQuality={mobile} renderingActive={inView && pageVisible} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  );
}
