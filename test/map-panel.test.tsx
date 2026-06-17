// MapPanel — the right-panel no-selection state (was MapStats). Covers the read-only stats (topics /
// branches / task progress over the live doc) AND the new Map settings: title rename, theme + layout
// selects, background colour, line-jumps toggle. Each control fires the prop App wires to the real
// handler. jsdom so the editable title + change events work.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MapPanel } from "../src/components/MapPanel";
import { themeById } from "../src/mindmap/theme";
import type { MindMapDoc } from "../src/model/types";

const noop = () => {};

const doc = (title: string, root: MindMapDoc["root"], meta?: MindMapDoc["meta"]): MindMapDoc => ({
  schemaVersion: 1,
  id: "d",
  title,
  root,
  meta,
});

const planDoc = doc("Plan", {
  id: "root",
  topic: "Plan",
  children: [
    { id: "a", topic: "A", task: { progress: 1 }, children: [] },
    {
      id: "b",
      topic: "B",
      task: { progress: 0.5 },
      children: [{ id: "b1", topic: "B1", children: [] }],
    },
    { id: "c", topic: "C", children: [] },
  ],
});

function setup(d: MindMapDoc = planDoc, over: Partial<React.ComponentProps<typeof MapPanel>> = {}) {
  const props = {
    doc: d,
    theme: themeById("light"),
    setThemeId: vi.fn(),
    layout: "side" as const,
    changeLayout: vi.fn(),
    background: d.meta?.background,
    onSetBackground: vi.fn(),
    onSetBackgroundImage: vi.fn(),
    handleBackgroundImage: noop,
    lineJumps: !!d.meta?.lineJumps,
    onToggleLineJumps: vi.fn(),
    onRenameMap: vi.fn(),
    ...over,
  };
  render(<MapPanel {...props} />);
  return props;
}

describe("MapPanel", () => {
  it("counts topics + first-level branches and shows task progress", () => {
    setup();
    expect(screen.getByText("No node selected")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy(); // root + a + b + b1 + c
    expect(screen.getByText("3")).toBeTruthy(); // branches
    expect(screen.getByText("Task progress")).toBeTruthy();
    expect(screen.getByText("1/2")).toBeTruthy(); // 1 of 2 tasks done
  });

  it("hides the task-progress block when nothing carries progress", () => {
    setup(
      doc("Ideas", {
        id: "root",
        topic: "Ideas",
        children: [{ id: "a", topic: "A", children: [] }],
      }),
    );
    expect(screen.queryByText("Task progress")).toBeNull();
    expect(screen.getByText("branch")).toBeTruthy(); // singular for 1 branch
  });

  it("commits the title via onRenameMap on blur (and not on every keystroke)", async () => {
    const { onRenameMap } = setup();
    const input = screen.getByLabelText("Map title");
    await userEvent.clear(input);
    await userEvent.type(input, "New name");
    expect(onRenameMap).not.toHaveBeenCalled(); // typing alone doesn't commit
    await userEvent.tab(); // blur
    expect(onRenameMap).toHaveBeenCalledWith("New name");
  });

  it("reflects + drives theme, layout, background colour and line-jumps", async () => {
    const { setThemeId, changeLayout, onSetBackground, onToggleLineJumps } = setup(
      doc(
        "M",
        { id: "root", topic: "M", children: [] },
        { background: "#ffeecc", lineJumps: true },
      ),
    );
    expect((screen.getByLabelText("Canvas theme") as HTMLSelectElement).value).toBe("light");
    expect((screen.getByLabelText("Background colour") as HTMLInputElement).value).toBe("#ffeecc");
    expect((screen.getByLabelText(/Line jumps/) as HTMLInputElement).checked).toBe(true);

    await userEvent.selectOptions(screen.getByLabelText("Canvas theme"), "dark");
    expect(setThemeId).toHaveBeenCalledWith("dark");
    await userEvent.selectOptions(screen.getByLabelText("Layout"), "grid");
    expect(changeLayout).toHaveBeenCalledWith("grid");
    await userEvent.click(screen.getByLabelText(/Line jumps/));
    expect(onToggleLineJumps).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onSetBackground).toHaveBeenCalledWith("");
  });

  it("disables the layout select in free-canvas mode", () => {
    setup(doc("F", { id: "root", topic: "F", children: [] }, { freeform: true }), {
      freeform: true,
    });
    expect((screen.getByLabelText("Layout") as HTMLSelectElement).disabled).toBe(true);
  });

  it("shows backdrop ring + remove controls only when the map has a backdrop", () => {
    const onBackdropRings = vi.fn();
    const onClearBackdrop = vi.fn();
    // No backdrop → no section.
    setup(planDoc, { onBackdropRings, onClearBackdrop });
    expect(screen.queryByText("Backdrop")).toBeNull();
  });

  it("drives onion backdrop rings + remove from the inspector", async () => {
    const onBackdropRings = vi.fn();
    const onClearBackdrop = vi.fn();
    const d: MindMapDoc = { ...planDoc, backdrop: { kind: "onion", rings: 3 } };
    setup(d, { onBackdropRings, onClearBackdrop });
    expect(screen.getByText("Backdrop")).toBeTruthy();
    expect(screen.getByText("Onion (rings)")).toBeTruthy();
    await userEvent.click(screen.getByLabelText("More rings"));
    expect(onBackdropRings).toHaveBeenCalledWith(1);
    await userEvent.click(screen.getByLabelText("Fewer rings"));
    expect(onBackdropRings).toHaveBeenCalledWith(-1);
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onClearBackdrop).toHaveBeenCalled();
  });

  it("hides the ring buttons for a venn backdrop (rings don't apply)", () => {
    const d: MindMapDoc = { ...planDoc, backdrop: { kind: "venn3" } };
    setup(d, { onBackdropRings: vi.fn(), onClearBackdrop: vi.fn() });
    expect(screen.getByText("Venn (3 circles)")).toBeTruthy();
    expect(screen.queryByLabelText("More rings")).toBeNull();
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();
  });
});
