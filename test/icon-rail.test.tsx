import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IconRail } from "../src/components/IconRail";

// IconRail — the 56px left rail. Every button is wired to a real handler (no decorative no-ops), so
// the test asserts each affordance fires its callback, and that the image control is a real picker.

function setup(over: Partial<Parameters<typeof IconRail>[0]> = {}) {
  const props = {
    onHome: vi.fn(),
    onFind: vi.fn(),
    onImage: vi.fn(),
    onPaste: vi.fn(),
    onShortcuts: vi.fn(),
    onSettings: vi.fn(),
    ...over,
  };
  render(<IconRail {...props} />);
  return props;
}

describe("IconRail", () => {
  it("fires onHome from the brand mark", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /back to start/i }));
    expect(p.onHome).toHaveBeenCalledTimes(1);
  });

  it("fires onFind, onPaste and onShortcuts from their buttons", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /find in map/i }));
    await userEvent.click(screen.getByRole("button", { name: /paste text/i }));
    await userEvent.click(screen.getByRole("button", { name: /keyboard shortcuts/i }));
    expect(p.onFind).toHaveBeenCalledTimes(1);
    expect(p.onPaste).toHaveBeenCalledTimes(1);
    expect(p.onShortcuts).toHaveBeenCalledTimes(1);
  });

  it("fires onSettings from the settings button", async () => {
    const p = setup();
    await userEvent.click(screen.getByRole("button", { name: /settings/i }));
    expect(p.onSettings).toHaveBeenCalledTimes(1);
  });

  it("exposes an image file picker wired to onImage", async () => {
    const p = setup();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.accept).toBe("image/*");
    const file = new File(["x"], "pic.png", { type: "image/png" });
    await userEvent.upload(input, file);
    expect(p.onImage).toHaveBeenCalledTimes(1);
  });
});
