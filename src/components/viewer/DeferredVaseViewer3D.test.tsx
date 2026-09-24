import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DeferredVaseViewer3D } from "./DeferredVaseViewer3D";

vi.mock("./VaseViewer3D", () => ({
  VaseViewer3D: ({ renderingActive }: { renderingActive: boolean }) => (
    <div data-testid="viewer" data-active={String(renderingActive)} />
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("defers the mobile viewer and pauses it offscreen or in a hidden tab without unmounting", async () => {
  let notify: IntersectionObserverCallback;
  const disconnect = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        notify = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  const { unmount } = render(<DeferredVaseViewer3D mobile />);
  expect(screen.queryByTestId("viewer")).toBeNull();
  const intersect = async (isIntersecting: boolean) => {
    await act(async () =>
      notify([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver),
    );
  };
  await intersect(true);
  const viewer = await screen.findByTestId("viewer");
  expect(viewer.dataset.active).toBe("true");
  await intersect(false);
  expect(screen.getByTestId("viewer")).toBe(viewer);
  expect(viewer.dataset.active).toBe("false");
  await intersect(true);
  visibility.mockReturnValue("hidden");
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(viewer.dataset.active).toBe("false");
  visibility.mockReturnValue("visible");
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(viewer.dataset.active).toBe("true");
  unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});
