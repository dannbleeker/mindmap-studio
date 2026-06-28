// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type DockEntry, PanelDock } from "../src/components/PanelDock";

const entry = (key: string, label: string, onClose = vi.fn()): DockEntry => ({
  key,
  label,
  onClose,
  node: <div data-testid={`body-${key}`}>{label} body</div>,
});

describe("PanelDock", () => {
  it("renders nothing when there are no open panels", () => {
    const { container } = render(<PanelDock entries={[]} active={null} onActivate={vi.fn()} />);
    expect(container.querySelector(".mm-dock")).toBeNull();
  });

  it("renders one tab per panel and shows only the active body", () => {
    render(
      <PanelDock
        entries={[entry("outline", "Outline"), entry("stats", "Stats")]}
        active="outline"
        onActivate={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    // Only the active panel's body renders.
    expect(screen.getByTestId("body-outline")).toBeTruthy();
    expect(screen.queryByTestId("body-stats")).toBeNull();
    expect(screen.getByRole("tab", { name: "Outline" }).getAttribute("aria-selected")).toBe("true");
  });

  it("activates a tab on click and closes a panel from its ×", () => {
    const onActivate = vi.fn();
    const onCloseStats = vi.fn();
    render(
      <PanelDock
        entries={[entry("outline", "Outline"), entry("stats", "Stats", onCloseStats)]}
        active="outline"
        onActivate={onActivate}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Stats" }));
    expect(onActivate).toHaveBeenCalledWith("stats");
    fireEvent.click(screen.getByRole("button", { name: "Close Stats" }));
    expect(onCloseStats).toHaveBeenCalledTimes(1);
  });

  it("falls back to the last entry when `active` matches nothing open", () => {
    render(
      <PanelDock
        entries={[entry("outline", "Outline"), entry("stats", "Stats")]}
        active="closed-panel"
        onActivate={vi.fn()}
      />,
    );
    expect(screen.getByTestId("body-stats")).toBeTruthy(); // last entry shown
  });
});
