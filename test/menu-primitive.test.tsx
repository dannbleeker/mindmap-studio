// The shared accessible Menu primitive (src/design/primitives.tsx) — the substrate the toolbar's
// five menus + the canvas context menu migrate onto. Drives it through the keyboard + pointer the
// way a real user (and a screen reader) would: open, rove with arrows (skipping disabled), Home/End,
// Enter to activate, Escape to close + restore focus, click-outside, and the checkbox semantics.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuLabel,
  MenuSeparator,
} from "../src/design/primitives";

const u = userEvent.setup();

function Fixture({
  onAlpha = () => {},
  onGamma = () => {},
  onToggle = () => {},
  checked = false,
}: {
  onAlpha?: () => void;
  onGamma?: () => void;
  onToggle?: () => void;
  checked?: boolean;
}) {
  return (
    <div>
      <button type="button">outside</button>
      <Menu trigger="Tools" triggerTitle="Tools">
        <MenuLabel>Section</MenuLabel>
        <MenuItem label="Alpha" onSelect={onAlpha} />
        <MenuItem label="Disabled" disabled onSelect={() => {}} />
        <MenuSeparator />
        <MenuItem label="Gamma" onSelect={onGamma} />
        <MenuCheckboxItem label="Toggle" checked={checked} onSelect={onToggle} />
      </Menu>
    </div>
  );
}

describe("Menu primitive", () => {
  it("advertises aria-haspopup=menu, toggles aria-expanded, and focuses the first item on open", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Tools" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("menu")).toBeNull();

    await u.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Alpha" }));
  });

  it("roves with ArrowDown/Up (wrapping) and skips disabled items", async () => {
    render(<Fixture />);
    await u.click(screen.getByRole("button", { name: "Tools" }));
    // Alpha → (skip Disabled) → Gamma → Toggle → wrap to Alpha.
    await u.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Gamma" }));
    await u.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("menuitemcheckbox", { name: "Toggle" }));
    await u.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Alpha" }));
    // ArrowUp wraps back to the last item.
    await u.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(screen.getByRole("menuitemcheckbox", { name: "Toggle" }));
  });

  it("Home/End jump to the first/last item", async () => {
    render(<Fixture />);
    await u.click(screen.getByRole("button", { name: "Tools" }));
    await u.keyboard("{End}");
    expect(document.activeElement).toBe(screen.getByRole("menuitemcheckbox", { name: "Toggle" }));
    await u.keyboard("{Home}");
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Alpha" }));
  });

  it("Enter on an item activates it, closes the menu, and restores focus to the trigger", async () => {
    const onAlpha = vi.fn();
    render(<Fixture onAlpha={onAlpha} />);
    const trigger = screen.getByRole("button", { name: "Tools" });
    await u.click(trigger); // focus lands on Alpha
    await u.keyboard("{Enter}");
    expect(onAlpha).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("Escape closes the menu and restores focus to the trigger", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Tools" });
    await u.click(trigger);
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on a click outside the menu", async () => {
    render(<Fixture />);
    await u.click(screen.getByRole("button", { name: "Tools" }));
    expect(screen.getByRole("menu")).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("ArrowDown on the closed trigger opens the menu and focuses the first item", async () => {
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: "Tools" });
    trigger.focus();
    await u.keyboard("{ArrowDown}");
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Alpha" }));
  });

  it("a checkbox item exposes aria-checked, fires onSelect, and keeps the menu open", async () => {
    const onToggle = vi.fn();
    render(<Fixture onToggle={onToggle} checked={false} />);
    await u.click(screen.getByRole("button", { name: "Tools" }));
    const cb = screen.getByRole("menuitemcheckbox", { name: "Toggle" });
    expect(cb.getAttribute("aria-checked")).toBe("false");
    await u.click(cb);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("menu")).toBeTruthy(); // stays open for more toggling
  });

  it("a plain MenuItem closes the menu on select", async () => {
    const onGamma = vi.fn();
    render(<Fixture onGamma={onGamma} />);
    await u.click(screen.getByRole("button", { name: "Tools" }));
    await u.click(screen.getByRole("menuitem", { name: "Gamma" }));
    expect(onGamma).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
