// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "../src/components/SettingsDialog";

// SettingsDialog renders inside the shared native-<dialog> wrapper; guard-stub the modal methods
// (jsdom may lack them) the same way the other dialog tests do.
beforeAll(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
  }
});

function setup(over: Partial<Parameters<typeof SettingsDialog>[0]> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    appearance: "system" as const,
    setAppearance: vi.fn(),
    motionPref: "system" as const,
    setMotionPref: vi.fn(),
    contrastPref: "system" as const,
    setContrastPref: vi.fn(),
    onReShowGettingStarted: vi.fn(),
    onClearRecents: vi.fn(),
    onClearBranchClipboard: vi.fn(),
    onClearAllData: vi.fn(),
    ...over,
  };
  render(<SettingsDialog {...props} />);
  return props;
}

describe("SettingsDialog", () => {
  it("renders the sections", () => {
    setup();
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByText("Appearance")).toBeTruthy();
    expect(screen.getByText("Local data")).toBeTruthy();
  });

  // Design-surface consolidation (T3-25): the canvas-theme select used to live here too, duplicating
  // the Map panel's. Removed — this guards against it silently reappearing, and that the copy still
  // points users to where it now lives (the one home for the map's look).
  it("no longer duplicates the canvas-theme picker (moved to the Map panel)", () => {
    setup();
    expect(screen.queryByLabelText("Canvas theme")).toBeNull();
    expect(screen.getByText(/canvas theme.*lives in the map panel/i)).toBeTruthy();
  });

  it("drives the app-appearance select (System / Light / Dark)", async () => {
    const p = setup();
    await userEvent.selectOptions(screen.getByLabelText("App theme"), "dark");
    expect(p.setAppearance).toHaveBeenCalledWith("dark");
  });

  it("drives the reduce-motion select", async () => {
    const p = setup();
    await userEvent.selectOptions(screen.getByLabelText("Reduce motion"), "reduced");
    expect(p.setMotionPref).toHaveBeenCalledWith("reduced");
  });

  it("drives the high-contrast select", async () => {
    const p = setup();
    await userEvent.selectOptions(screen.getByLabelText("High contrast"), "high");
    expect(p.setContrastPref).toHaveBeenCalledWith("high");
  });

  it("shows the local-storage usage line when an estimate is available", async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, "storage");
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate: async () => ({ usage: 2 * 1024 * 1024, quota: 100 * 1024 * 1024 }) },
    });
    setup();
    expect(await screen.findByText(/used of/i)).toBeTruthy();
    if (original) Object.defineProperty(navigator, "storage", original);
    else Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "storage");
  });

  it("formats small storage sizes in B / KB", async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, "storage");
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { estimate: async () => ({ usage: 500, quota: 2048 }) },
    });
    setup();
    expect(await screen.findByText(/500 B used of 2 KB/i)).toBeTruthy();
    if (original) Object.defineProperty(navigator, "storage", original);
    else Reflect.deleteProperty(navigator as unknown as Record<string, unknown>, "storage");
  });

  it("fires each reset / clear action from its button", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /getting-started tips/i }));
    expect(p.onReShowGettingStarted).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /clear command history/i }));
    expect(p.onClearRecents).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /clear branch clipboard/i }));
    expect(p.onClearBranchClipboard).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /clear all local data/i }));
    expect(p.onClearAllData).toHaveBeenCalledTimes(1);
  });
});
