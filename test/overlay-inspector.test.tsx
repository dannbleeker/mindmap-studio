// Component test for OverlayInspector — the right panel for a selected boundary / summary / callout.
// Asserts each control fires the right callback (label/text commit, delete) and the header reflects
// the kind + caption. Visible-text/role/label assertions.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OverlayInspector } from "../src/components/OverlayInspector";
import type { SelectedOverlay } from "../src/mindmap";

const noop = () => {};

function setup(overlay: SelectedOverlay, caption = "3 topics") {
  const onSetLabel = vi.fn();
  const onDelete = vi.fn();
  render(
    <OverlayInspector
      overlay={overlay}
      caption={caption}
      onSetLabel={onSetLabel}
      onDelete={onDelete}
      onMinimize={noop}
    />,
  );
  return { onSetLabel, onDelete };
}

describe("OverlayInspector", () => {
  it("shows the kind eyebrow + caption for a boundary", () => {
    setup({ kind: "boundary", id: "b", label: "Scope", deletable: true }, "2 topics");
    expect(screen.getByLabelText("Overlay info")).toBeTruthy();
    expect(screen.getByText("Boundary")).toBeTruthy();
    expect(screen.getByText("2 topics")).toBeTruthy();
  });

  it("commits a boundary/summary label on Enter (trimmed)", async () => {
    const { onSetLabel } = setup({ kind: "summary", id: "s", label: "Phase 1", deletable: true });
    const input = screen.getByLabelText("Summary label");
    await userEvent.clear(input);
    await userEvent.type(input, "  Phase 2  {Enter}");
    expect(onSetLabel).toHaveBeenCalledWith("Phase 2");
  });

  it("uses a textarea for a callout and commits its text on blur", async () => {
    const { onSetLabel } = setup({
      kind: "callout",
      id: "c",
      nodeId: "n",
      label: "old",
      deletable: true,
    });
    const ta = screen.getByLabelText("Callout text");
    await userEvent.clear(ta);
    await userEvent.type(ta, "new note");
    await userEvent.tab();
    expect(onSetLabel).toHaveBeenCalledWith("new note");
  });

  it("fires onDelete from the danger button, and hides it when not deletable", async () => {
    const { onDelete } = setup({ kind: "boundary", id: "b", label: "Scope", deletable: true });
    await userEvent.click(screen.getByRole("button", { name: /Delete boundary/ }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("hides Delete when the overlay is not deletable", () => {
    setup({ kind: "boundary", id: "b", label: "Scope", deletable: false });
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull();
  });
});
