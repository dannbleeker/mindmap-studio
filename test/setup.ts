// Test setup for component + hook tests (the @testing-library/react net for the panels/hooks).
// jsdom doesn't implement the layout/observer APIs the panels and hooks reach for, so polyfill the
// handful they need here. Wired via vitest.config.ts `setupFiles`; runs before every test file.
//
// This file runs for EVERY test (setupFiles is global), including the pure-logic + store tests that
// use the `node` environment. Those have no `window`/`document`, so everything here is guarded to be
// a no-op under node — it only takes effect for the jsdom-environment component/hook tests.
import { afterEach } from "vitest";

const hasDom = typeof window !== "undefined" && typeof document !== "undefined";

if (hasDom) {
  // Unmount any rendered trees + clear jsdom between tests, so one panel render can't leak DOM into
  // the next assertion. (Vitest doesn't auto-cleanup; @testing-library leaves it to the setup file.)
  // Imported lazily so the `node`-environment tests never load testing-library (which needs a DOM).
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => {
    cleanup();
  });

  // ResizeObserver: React Flow + a few panels construct one on mount. jsdom has none — a minimal
  // no-op class is enough for the components under test (they don't depend on a fired callback here).
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  // IntersectionObserver: same story — present so a mount that constructs one doesn't throw.
  class IntersectionObserverStub {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): [] {
      return [];
    }
  }

  // <dialog>: jsdom implements the element but not showModal()/close(). The app's <Dialog> wrapper
  // calls them in an effect, so provide minimal versions that just toggle `open` + fire `close`.
  const dlg = globalThis.HTMLDialogElement?.prototype as
    | (HTMLDialogElement & { showModal: () => void; close: () => void })
    | undefined;
  if (dlg && typeof dlg.showModal !== "function") {
    dlg.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    dlg.close = function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }

  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
  }
  if (typeof globalThis.IntersectionObserver === "undefined") {
    globalThis.IntersectionObserver =
      IntersectionObserverStub as unknown as typeof IntersectionObserver;
  }

  // matchMedia: jsdom doesn't implement it; useIsMobile + useTheme read it. Return a non-matching,
  // fully-shaped MediaQueryList (with both the modern add/removeEventListener and the legacy
  // add/removeListener) so the hooks can subscribe + unsubscribe without a guard.
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }
}
