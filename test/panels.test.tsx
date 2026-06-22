// Render-smoke tests for the left-rail panels in src/Panels.tsx. This is the safety net for the
// later Panels refactor (Phase D): each panel must mount without throwing AND show a known piece of
// user-visible content. Assertions target visible text / roles / labels — NOT internal structure —
// so they keep passing after the panels are rebuilt on shared primitives.
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  FilterPanel,
  HistoryPanel,
  InfoPanel,
  MarkerTagIndex,
  type NamedStyle,
  NoteEditorPanel,
  OutlinePanel,
  StatsPanel,
  StyleBar,
  StylesPanel,
  WalkBar,
} from "../src/Panels";
import type { SelectedNode, SelectionFields } from "../src/mindmap";
import type { MapNode, MindMapDoc } from "../src/model/types";
import type { Backlink } from "../src/outline";

// A small but representative tree: a root with two children, one carrying a marker, a tag, a note,
// and task progress — so the index/outline panels have real content to render.
const sampleRoot = (): MapNode => ({
  id: "r",
  topic: "Launch plan",
  children: [
    {
      id: "a",
      topic: "Research",
      note: "interview users",
      icons: ["⭐"],
      tags: ["risk"],
      task: { progress: 0.5 },
      children: [{ id: "a1", topic: "Surveys", children: [] }],
    },
    { id: "b", topic: "Build", children: [] },
  ],
});

const noop = () => {};

describe("OutlinePanel", () => {
  it("renders the filter box and a row for each topic", () => {
    render(<OutlinePanel root={sampleRoot()} filter="" onFilterChange={noop} onPick={noop} />);
    expect(screen.getByLabelText("Filter outline")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Launch plan/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Research/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Build/ })).toBeTruthy();
  });

  it("honours the filter text (only matching rows render)", () => {
    render(<OutlinePanel root={sampleRoot()} filter="build" onFilterChange={noop} onPick={noop} />);
    expect(screen.getByRole("button", { name: /Build/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Research/ })).toBeNull();
  });
});

describe("MarkerTagIndex", () => {
  it("renders the heading and groups markers + tags found in the map", () => {
    render(<MarkerTagIndex root={sampleRoot()} onPick={noop} />);
    expect(screen.getByText(/Markers & tags/)).toBeTruthy();
    expect(screen.getByText("Markers")).toBeTruthy();
    expect(screen.getByText("Tags")).toBeTruthy();
    // the node carrying the marker/tag is reachable by name (a jump button)
    expect(screen.getAllByRole("button", { name: /Research/ }).length).toBeGreaterThan(0);
  });

  it("shows an empty-state message for a map with no markers or tags", () => {
    const bare: MapNode = { id: "r", topic: "Bare", children: [] };
    render(<MarkerTagIndex root={bare} onPick={noop} />);
    expect(screen.getByText(/No markers or tags in this map yet/)).toBeTruthy();
  });
});

describe("FilterPanel", () => {
  it("renders the Power Filter controls and the marker/tag chips", () => {
    render(
      <FilterPanel
        root={sampleRoot()}
        text=""
        markers={[]}
        tags={[]}
        due=""
        priority={0}
        matchCount={0}
        savedFilters={[]}
        onText={noop}
        onToggleMarker={noop}
        onToggleTag={noop}
        onDue={noop}
        onPriority={noop}
        onClear={noop}
        onSaveFilter={noop}
        onApplyFilter={noop}
        onDeleteFilter={noop}
      />,
    );
    expect(screen.getByText(/Power Filter/)).toBeTruthy();
    expect(screen.getByLabelText("Filter by text")).toBeTruthy();
    expect(screen.getByLabelText("Filter by due date")).toBeTruthy();
    expect(screen.getByLabelText("Filter by priority")).toBeTruthy();
    // a chip for the tag present in the sample map
    expect(screen.getByRole("button", { name: "risk" })).toBeTruthy();
  });

  it("shows the live match count when a filter is active", () => {
    render(
      <FilterPanel
        root={sampleRoot()}
        text="research"
        markers={[]}
        tags={[]}
        due=""
        priority={0}
        matchCount={3}
        savedFilters={[]}
        onText={noop}
        onToggleMarker={noop}
        onToggleTag={noop}
        onDue={noop}
        onPriority={noop}
        onClear={noop}
        onSaveFilter={noop}
        onApplyFilter={noop}
        onDeleteFilter={noop}
      />,
    );
    expect(screen.getByText("3 matches")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
  });
});

describe("StylesPanel", () => {
  it("renders the conditional-formatting + named-styles sections", () => {
    render(
      <StylesPanel
        rules={[]}
        markers={["⭐", "🚩"]}
        namedStyles={[]}
        onAddRule={noop}
        onDeleteRule={noop}
        onSaveStyle={noop}
        onApplyStyle={noop}
        onDeleteStyle={noop}
      />,
    );
    expect(screen.getByText(/Styles/)).toBeTruthy();
    expect(screen.getByText("Conditional formatting")).toBeTruthy();
  });

  it("lists existing named styles by name", () => {
    const named: NamedStyle[] = [{ id: "s1", name: "Highlight", style: { background: "#ff0" } }];
    render(
      <StylesPanel
        rules={[]}
        markers={[]}
        namedStyles={named}
        onAddRule={noop}
        onDeleteRule={noop}
        onSaveStyle={noop}
        onApplyStyle={noop}
        onDeleteStyle={noop}
      />,
    );
    expect(screen.getByText("Highlight")).toBeTruthy();
  });
});

describe("HistoryPanel", () => {
  it("renders the header + actions and an empty-state when there are no versions", () => {
    render(
      <HistoryPanel versions={[]} onSaveNow={noop} onPlay={noop} onRestore={noop} onClose={noop} />,
    );
    expect(screen.getByText(/History/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Save version now/ })).toBeTruthy();
    expect(screen.getByText(/No saved versions yet/)).toBeTruthy();
  });

  it("lists saved versions with a Restore control each", () => {
    render(
      <HistoryPanel
        versions={[
          { id: "v1", ts: Date.now(), title: "Now", nodeCount: 4 },
          { id: "v2", ts: Date.now() - 60_000, title: "Earlier", nodeCount: 3 },
        ]}
        onSaveNow={noop}
        onPlay={noop}
        onRestore={noop}
        onClose={noop}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Restore" })).toHaveLength(2);
  });
});

describe("InfoPanel", () => {
  const selected: SelectedNode = { id: "a", topic: "Research", note: "interview users" };
  const node = sampleRoot().children[0];

  const renderInfo = (
    sel: SelectedNode | null,
    n: MapNode | null,
    count?: number,
    nonce?: number,
    fields?: SelectionFields,
    backlinks: Backlink[] = [],
    onFollowBacklink: (id: string) => void = noop,
    times?: string,
    bulk?: {
      markers?: { all: string[]; some: string[] };
      tags?: { all: string[]; some: string[] };
      onMarker?: (m: string) => void;
      onTag?: (t: string) => void;
    },
  ) =>
    render(
      <InfoPanel
        selected={sel}
        selectedCount={count}
        times={times}
        fields={fields}
        openNoteNonce={nonce}
        width={300}
        onResize={noop}
        node={n}
        noteDraft={n?.note ?? ""}
        onNoteChange={noop}
        onNoteBlur={noop}
        markers={["⭐", "🚩"]}
        onToggleMarker={noop}
        bulkMarkers={bulk?.markers}
        bulkTags={bulk?.tags}
        onBulkToggleMarker={bulk?.onMarker}
        onBulkToggleTag={bulk?.onTag}
        onPickSticker={noop}
        onStyle={noop}
        onAddTag={noop}
        onRemoveTag={noop}
        onSetProgress={noop}
        onSetDue={noop}
        onSetStart={noop}
        onSetPriority={noop}
        onAddAttachment={noop}
        onRemoveAttachment={noop}
        onSetHyperlink={noop}
        maps={[]}
        onLinkMap={noop}
        jumpTargets={[]}
        onJump={noop}
        backlinks={backlinks}
        onFollowBacklink={onFollowBacklink}
        onMinimize={noop}
      />,
    );

  it("shows a placeholder when nothing is selected", () => {
    renderInfo(null, null);
    expect(screen.getByText(/Select a node to see and edit its details/)).toBeTruthy();
  });

  it("shows a Minimize control and the Details + Style tabs for the selected node", () => {
    renderInfo(selected, node);
    expect(screen.getByRole("button", { name: /Minimize/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Details" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Style" })).toBeTruthy();
    // Notes folded into Details (#7) — no separate Notes tab.
    expect(screen.queryByRole("tab", { name: "Notes" })).toBeNull();
  });

  it("renders the created/modified times line when provided, and omits it when empty", () => {
    const { unmount } = renderInfo(
      selected,
      node,
      undefined,
      undefined,
      undefined,
      [],
      noop,
      "created 2h ago · modified 1h ago",
    );
    expect(screen.getByText("created 2h ago · modified 1h ago")).toBeTruthy();
    unmount();
    renderInfo(selected, node); // no times → line absent
    expect(screen.queryByText(/created .* ago/)).toBeNull();
  });

  it("opens on Details, leading with the note editor + markers, then tags / dates / priority / links (#7)", () => {
    renderInfo(selected, node);
    expect(screen.getByRole("tab", { name: "Details" }).getAttribute("aria-selected")).toBe("true");
    // Note + markers now lead Details — one click from the default inspector view.
    const editor = screen.getByRole("textbox", { name: "Node note" });
    expect(editor.textContent).toContain("interview users");
    expect(screen.getByText("Markers")).toBeTruthy();
    expect(screen.getByText("Tags")).toBeTruthy();
    expect(screen.getByText("Dates")).toBeTruthy();
    expect(screen.getByText("Priority")).toBeTruthy();
    expect(screen.getByText("Links")).toBeTruthy();
  });

  it("hides the Details note/markers/tags once the Style tab is active (#7)", async () => {
    renderInfo(selected, node);
    await userEvent.click(screen.getByRole("tab", { name: "Style" }));
    expect(screen.queryByRole("textbox", { name: "Node note" })).toBeNull();
    expect(screen.queryByText("Priority")).toBeNull();
  });

  it("reveals the shape + sticker controls after switching to the Style tab", async () => {
    renderInfo(selected, node);
    await userEvent.click(screen.getByRole("tab", { name: "Style" }));
    expect(screen.getByText("Shape")).toBeTruthy();
    expect(screen.getByText(/Stickers/)).toBeTruthy();
    expect(screen.queryByText("Tags")).toBeNull();
  });

  it("enters bulk mode for a multi-selection (banner shown, per-item editors hidden, no Notes tab)", () => {
    renderInfo(selected, node, 3);
    expect(screen.getByText(/3 topics selected/)).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Notes" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Details" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Style" })).toBeTruthy();
    // Details (default) keeps the value-setting editors that fold across a set…
    expect(screen.getByText("Dates")).toBeTruthy();
    expect(screen.getByText("Priority")).toBeTruthy();
    // …Attachments/Links stay single-topic; Tags only appears in bulk when a summary is supplied
    // (the tri-state block, exercised below) — none is passed here.
    expect(screen.queryByText("Tags")).toBeNull();
    expect(screen.queryByText("Attachments")).toBeNull();
    expect(screen.queryByText("Links")).toBeNull();
  });

  it("bulk Style tab keeps the style bar but hides per-item stickers", async () => {
    renderInfo(selected, node, 3);
    await userEvent.click(screen.getByRole("tab", { name: "Style" }));
    expect(screen.getByText("Shape")).toBeTruthy(); // StyleBar applies to all
    expect(screen.queryByText(/Stickers/)).toBeNull(); // per-item sticker grid hidden
  });

  it("bulk mode shows tri-state markers + tags and toggles them across the selection", async () => {
    const onMarker = vi.fn();
    const onTag = vi.fn();
    renderInfo(selected, node, 3, undefined, undefined, [], noop, undefined, {
      markers: { all: ["⭐"], some: ["🚩"] },
      tags: { all: ["risk"], some: ["wip"] },
      onMarker,
      onTag,
    });
    // Details tab (default): tri-state tags — "risk" on all (✕ removes), "wip" on some (+ adds).
    expect(screen.getByText("risk ✕")).toBeTruthy();
    await userEvent.click(screen.getByText("wip +"));
    expect(onTag).toHaveBeenCalledWith("wip");
    // Style tab: tri-state markers — clicking the partial 🚩 adds it to all.
    await userEvent.click(screen.getByRole("tab", { name: "Style" }));
    await userEvent.click(screen.getByRole("button", { name: "🚩" }));
    expect(onMarker).toHaveBeenCalledWith("🚩");
  });

  it("bulk mode blanks a mixed field + shows a 'Mixed' hint instead of the anchor's value", () => {
    // The anchor carries concrete task values; the selection disagrees on due/priority/progress.
    const tasked: MapNode = { ...node, task: { due: "2026-07-01", priority: 1, progress: 0.5 } };
    renderInfo(selected, tasked, 3, undefined, {
      count: 3,
      mixed: { progress: true, priority: true, start: false, due: true },
    });
    // The due date is NOT pre-filled with the anchor's value (would silently overwrite all on edit).
    expect((screen.getByLabelText("Due date") as HTMLInputElement).value).toBe("");
    // No priority button reads as active (the anchor's High priority isn't highlighted).
    expect(screen.getByRole("button", { name: "High" }).getAttribute("aria-pressed")).not.toBe(
      "true",
    );
    // …and at least one "Mixed" hint is rendered for the differing fields.
    expect(screen.getAllByText("Mixed").length).toBeGreaterThan(0);
  });

  it("bulk mode still shows the shared value for a uniform field (not blanked)", () => {
    const tasked: MapNode = { ...node, task: { due: "2026-07-01" } };
    renderInfo(selected, tasked, 2, undefined, {
      count: 2,
      mixed: { progress: false, priority: false, start: false, due: false },
    });
    expect((screen.getByLabelText("Due date") as HTMLInputElement).value).toBe("2026-07-01");
    expect(screen.queryByText("Mixed")).toBeNull();
  });

  it("omits the 'Linked from' section when nothing points at the node", () => {
    renderInfo(selected, node);
    expect(screen.queryByText("Linked from")).toBeNull();
  });

  it("lists incoming backlinks and follows one on click (navigation, not onJump)", async () => {
    const onFollow = vi.fn();
    const backlinks: Backlink[] = [
      { id: "src1", topic: "Roadmap", kind: "hyperlink" },
      { id: "src2", topic: "Risk", kind: "relationship", label: "blocks" },
    ];
    renderInfo(selected, node, undefined, undefined, undefined, backlinks, onFollow);
    expect(screen.getByText("Linked from")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Roadmap/ })).toBeTruthy();
    // The relationship row carries its edge label.
    expect(screen.getByText(/blocks/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Risk/ }));
    expect(onFollow).toHaveBeenCalledWith("src2");
  });

  it("hides 'Linked from' in bulk mode (per-item, single-topic only)", () => {
    renderInfo(selected, node, 3, undefined, undefined, [
      { id: "src1", topic: "Roadmap", kind: "hyperlink" },
    ]);
    expect(screen.queryByText("Linked from")).toBeNull();
  });

  it("surfaces the note on Details when openNoteNonce is set (the node 📝 click target) (#7)", () => {
    renderInfo(selected, node, 1, 1);
    expect(screen.getByRole("tab", { name: "Details" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("textbox", { name: "Node note" })).toBeTruthy();
  });
});

describe("StyleBar", () => {
  it("renders the per-topic style controls (a Shape label + shape buttons)", () => {
    render(<StyleBar onStyle={noop} />);
    expect(screen.getByText("Shape")).toBeTruthy();
    // the diamond shape picker is present (asserted by its title/accessible name)
    expect(screen.getByRole("button", { name: /Diamond/ })).toBeTruthy();
  });

  it("fires onStyle callback when a shape button is clicked", async () => {
    const onStyle = vi.fn();
    render(<StyleBar onStyle={onStyle} />);
    const diamondBtn = screen.getByRole("button", { name: /Diamond/ });
    await userEvent.click(diamondBtn);
    expect(onStyle).toHaveBeenCalledWith({ shape: "diamond" });
  });

  it("renders fill and border color swatches", () => {
    const onStyle = vi.fn();
    render(<StyleBar onStyle={onStyle} />);
    expect(screen.getByText("Fill")).toBeTruthy();
    expect(screen.getByText("Border")).toBeTruthy();
  });

  it("renders the bold text toggle button", () => {
    const onStyle = vi.fn();
    render(<StyleBar onStyle={onStyle} />);
    // Bold button has a "B" icon with accessible text
    const boldButtons = screen.getAllByRole("button", { name: "B" });
    expect(boldButtons.length).toBeGreaterThan(0);
  });

  it("fires onStyle when bold button is clicked", async () => {
    const onStyle = vi.fn();
    render(<StyleBar onStyle={onStyle} />);
    const boldBtn = screen.getByRole("button", { name: "B" });
    await userEvent.click(boldBtn);
    expect(onStyle).toHaveBeenCalledWith(
      expect.objectContaining({ fontWeight: expect.any(String) }),
    );
  });
});

describe("OutlinePanel (interaction)", () => {
  it("calls onPick when a topic row is clicked", async () => {
    const onPick = vi.fn();
    render(<OutlinePanel root={sampleRoot()} filter="" onFilterChange={noop} onPick={onPick} />);
    const researchBtn = screen.getByRole("button", { name: /Research/ });
    await userEvent.click(researchBtn);
    expect(onPick).toHaveBeenCalledWith("a");
  });

  it("shows depth indicators (indentation) for nested topics", () => {
    render(<OutlinePanel root={sampleRoot()} filter="" onFilterChange={noop} onPick={noop} />);
    // Surveys is nested under Research, so it should appear after Research
    const buttons = screen.getAllByRole("button");
    const researchIdx = buttons.findIndex((b) => b.textContent?.includes("Research"));
    const surveysIdx = buttons.findIndex((b) => b.textContent?.includes("Surveys"));
    expect(surveysIdx).toBeGreaterThan(researchIdx);
  });

  it("renders read-only (no promote/demote controls) when no edit callbacks are given", () => {
    render(<OutlinePanel root={sampleRoot()} filter="" onFilterChange={noop} onPick={noop} />);
    expect(screen.queryByRole("button", { name: "Promote topic" })).toBeNull();
  });

  it("commits an inline rename on double-click + Enter", async () => {
    const onRename = vi.fn();
    render(
      <OutlinePanel
        root={sampleRoot()}
        filter=""
        onFilterChange={noop}
        onPick={noop}
        onRename={onRename}
        onIndent={noop}
        onMove={noop}
      />,
    );
    await userEvent.dblClick(screen.getByRole("button", { name: /Research/ }));
    const input = screen.getByRole("textbox", { name: "Rename topic" });
    await userEvent.clear(input);
    await userEvent.type(input, "Discovery{Enter}");
    expect(onRename).toHaveBeenCalledWith("a", "Discovery");
  });

  it("promotes / demotes a topic via the ◂ ▸ controls", async () => {
    const onIndent = vi.fn();
    render(
      <OutlinePanel
        root={sampleRoot()}
        filter=""
        onFilterChange={noop}
        onPick={noop}
        onRename={noop}
        onIndent={onIndent}
        onMove={noop}
      />,
    );
    // Promote the "Surveys" (a1) row specifically — scope the query to its row.
    const row = screen.getByText("Surveys").closest("div") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: "Promote topic" }));
    expect(onIndent).toHaveBeenCalledWith("a1", "out");
  });
});

describe("MarkerTagIndex (interaction)", () => {
  it("calls onPick when a marker/tag row is clicked", async () => {
    const onPick = vi.fn();
    render(<MarkerTagIndex root={sampleRoot()} onPick={onPick} />);
    // Click any of the Research buttons (appears under both Markers and Tags)
    const researchButtons = screen.getAllByRole("button", { name: /Research/ });
    await userEvent.click(researchButtons[0]);
    expect(onPick).toHaveBeenCalledWith("a");
  });

  it("stays read-only (no tag manager controls) without the manager callbacks", () => {
    render(<MarkerTagIndex root={sampleRoot()} onPick={noop} />);
    expect(screen.queryByRole("button", { name: "Delete tag risk" })).toBeNull();
  });

  it("renames/merges a tag map-wide via the ✎ control", async () => {
    const onRenameTag = vi.fn();
    render(
      <MarkerTagIndex
        root={sampleRoot()}
        onPick={noop}
        onRenameTag={onRenameTag}
        onDeleteTag={noop}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Rename tag risk" }));
    const input = screen.getByRole("textbox", { name: "Rename tag risk" });
    await userEvent.clear(input);
    await userEvent.type(input, "danger{Enter}");
    expect(onRenameTag).toHaveBeenCalledWith("risk", "danger");
  });

  it("deletes a tag map-wide via the ✕ control", async () => {
    const onDeleteTag = vi.fn();
    render(
      <MarkerTagIndex
        root={sampleRoot()}
        onPick={noop}
        onRenameTag={noop}
        onDeleteTag={onDeleteTag}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete tag risk" }));
    expect(onDeleteTag).toHaveBeenCalledWith("risk");
  });

  it("maps a tag to a colour via the swatch (and shows ⊘ to clear an existing colour)", async () => {
    const onSetTagColor = vi.fn();
    render(
      <MarkerTagIndex
        root={sampleRoot()}
        onPick={noop}
        onRenameTag={noop}
        onDeleteTag={noop}
        tagColorOf={(t) => (t === "risk" ? "#ff0000" : undefined)}
        onSetTagColor={onSetTagColor}
      />,
    );
    // The swatch reflects the current colour and pushes a new pick.
    const swatch = screen.getByLabelText("Colour for tag risk") as HTMLInputElement;
    expect(swatch.value).toBe("#ff0000");
    fireEvent.input(swatch, { target: { value: "#00ff00" } });
    expect(onSetTagColor).toHaveBeenCalledWith("risk", "#00ff00");
    // A coloured tag offers the ⊘ clear button → clears to undefined.
    await userEvent.click(screen.getByRole("button", { name: "Clear colour for tag risk" }));
    expect(onSetTagColor).toHaveBeenCalledWith("risk", undefined);
  });

  it("hides the ⊘ clear button for a tag with no colour yet", () => {
    render(
      <MarkerTagIndex
        root={sampleRoot()}
        onPick={noop}
        onRenameTag={noop}
        onDeleteTag={noop}
        tagColorOf={() => undefined}
        onSetTagColor={noop}
      />,
    );
    expect(screen.getByLabelText("Colour for tag risk")).toBeTruthy(); // swatch present
    expect(screen.queryByRole("button", { name: "Clear colour for tag risk" })).toBeNull();
  });
});

describe("WalkBar", () => {
  it("shows the current topic, position, note, and steps via the controls", async () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const onExit = vi.fn();
    render(
      <WalkBar
        index={1}
        total={4}
        topic="Second"
        note="speaker note"
        onPrev={onPrev}
        onNext={onNext}
        onExit={onExit}
      />,
    );
    expect(screen.getByText("Second")).toBeTruthy();
    expect(screen.getByText("2 / 4")).toBeTruthy();
    expect(screen.getByText("speaker note")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Next topic" }));
    expect(onNext).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Exit" }));
    expect(onExit).toHaveBeenCalled();
  });

  it("disables Prev on the first topic and Next on the last", () => {
    const { rerender } = render(
      <WalkBar index={0} total={3} topic="A" onPrev={noop} onNext={noop} onExit={noop} />,
    );
    expect(screen.getByRole("button", { name: "Previous topic" })).toHaveProperty("disabled", true);
    rerender(<WalkBar index={2} total={3} topic="C" onPrev={noop} onNext={noop} onExit={noop} />);
    expect(screen.getByRole("button", { name: "Next topic" })).toHaveProperty("disabled", true);
  });
});

describe("NoteEditorPanel", () => {
  it("shows an empty-state hint and a working Close when nothing is selected", async () => {
    const onClose = vi.fn();
    render(
      <NoteEditorPanel selected={null} value="" onChange={noop} onBlur={noop} onClose={onClose} />,
    );
    expect(screen.getByText(/Select a topic to edit its note/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Close note editor" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("embeds the note editor for the selected topic", () => {
    render(
      <NoteEditorPanel
        selected={{ id: "a", topic: "Research", note: "" }}
        value="hello"
        onChange={noop}
        onBlur={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByText(/Research/)).toBeTruthy();
  });
});

describe("StatsPanel", () => {
  it("renders the map's headline counts", () => {
    const doc: MindMapDoc = {
      schemaVersion: 1,
      id: "d",
      title: "R",
      root: sampleRoot(),
    };
    render(<StatsPanel doc={doc} />);
    expect(screen.getByText(/Map statistics/)).toBeTruthy();
    expect(screen.getByText("Topics")).toBeTruthy();
    expect(screen.getByText("Distinct tags")).toBeTruthy();
  });
});

describe("FilterPanel (interaction)", () => {
  it("calls onClear when the Clear button is clicked", async () => {
    const onClear = vi.fn();
    render(
      <FilterPanel
        root={sampleRoot()}
        text="research"
        markers={[]}
        tags={[]}
        due=""
        priority={0}
        matchCount={3}
        savedFilters={[]}
        onText={noop}
        onToggleMarker={noop}
        onToggleTag={noop}
        onDue={noop}
        onPriority={noop}
        onClear={onClear}
        onSaveFilter={noop}
        onApplyFilter={noop}
        onDeleteFilter={noop}
      />,
    );
    const clearBtn = screen.getByRole("button", { name: "Clear" });
    await userEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });

  it("calls onToggleMarker when a marker chip is clicked", async () => {
    const onToggleMarker = vi.fn();
    render(
      <FilterPanel
        root={sampleRoot()}
        text=""
        markers={[]}
        tags={[]}
        due=""
        priority={0}
        matchCount={0}
        savedFilters={[]}
        onText={noop}
        onToggleMarker={onToggleMarker}
        onToggleTag={noop}
        onDue={noop}
        onPriority={noop}
        onClear={noop}
        onSaveFilter={noop}
        onApplyFilter={noop}
        onDeleteFilter={noop}
      />,
    );
    // The sample map has a ⭐ marker
    const markerChips = screen.getAllByRole("button", { name: "⭐" });
    if (markerChips.length > 0) {
      await userEvent.click(markerChips[0]);
      expect(onToggleMarker).toHaveBeenCalledWith("⭐");
    }
  });

  it("calls onDue when the due date filter changes", async () => {
    const onDue = vi.fn();
    render(
      <FilterPanel
        root={sampleRoot()}
        text=""
        markers={[]}
        tags={[]}
        due=""
        priority={0}
        matchCount={0}
        savedFilters={[]}
        onText={noop}
        onToggleMarker={noop}
        onToggleTag={noop}
        onDue={onDue}
        onPriority={noop}
        onClear={noop}
        onSaveFilter={noop}
        onApplyFilter={noop}
        onDeleteFilter={noop}
      />,
    );
    const dueSelect = screen.getByLabelText("Filter by due date") as HTMLSelectElement;
    await userEvent.selectOptions(dueSelect, "overdue");
    expect(onDue).toHaveBeenCalledWith("overdue");
  });
});

describe("InfoPanel (interaction)", () => {
  const selected: SelectedNode = { id: "a", topic: "Research", note: "interview users" };
  const node = sampleRoot().children[0];

  const renderInfo = (sel: SelectedNode | null, n: MapNode | null) => {
    const onNoteChange = vi.fn();
    const onMinimize = vi.fn();
    const result = render(
      <InfoPanel
        selected={sel}
        width={300}
        onResize={noop}
        node={n}
        noteDraft={n?.note ?? ""}
        onNoteChange={onNoteChange}
        onNoteBlur={noop}
        markers={["⭐", "🚩"]}
        onToggleMarker={noop}
        onPickSticker={noop}
        onStyle={noop}
        onAddTag={noop}
        onRemoveTag={noop}
        onSetProgress={noop}
        onSetDue={noop}
        onSetStart={noop}
        onSetPriority={noop}
        onAddAttachment={noop}
        onRemoveAttachment={noop}
        onSetHyperlink={noop}
        maps={[]}
        onLinkMap={noop}
        jumpTargets={[]}
        onJump={noop}
        backlinks={[]}
        onFollowBacklink={noop}
        onMinimize={onMinimize}
      />,
    );
    return { result, onNoteChange, onMinimize };
  };

  it("calls onMinimize when the Minimize button is clicked", async () => {
    const { onMinimize } = renderInfo(selected, node);
    const minBtn = screen.getByRole("button", { name: /Minimize/ });
    await userEvent.click(minBtn);
    expect(onMinimize).toHaveBeenCalled();
  });
});

describe("StylesPanel (interaction)", () => {
  it("shows an empty state message when there are no rules or styles", () => {
    render(
      <StylesPanel
        rules={[]}
        markers={["⭐"]}
        namedStyles={[]}
        onAddRule={noop}
        onDeleteRule={noop}
        onSaveStyle={noop}
        onApplyStyle={noop}
        onDeleteStyle={noop}
      />,
    );
    expect(screen.getByText(/Styles/)).toBeTruthy();
    expect(screen.getByText("Conditional formatting")).toBeTruthy();
  });

  it("displays multiple named styles in a list", () => {
    const named = [
      { id: "s1", name: "Highlight", style: { background: "#ff0" } },
      { id: "s2", name: "Bold Red", style: { background: "#f00", fontWeight: "bold" } },
    ];
    render(
      <StylesPanel
        rules={[]}
        markers={[]}
        namedStyles={named}
        onAddRule={noop}
        onDeleteRule={noop}
        onSaveStyle={noop}
        onApplyStyle={noop}
        onDeleteStyle={noop}
      />,
    );
    expect(screen.getByText("Highlight")).toBeTruthy();
    expect(screen.getByText("Bold Red")).toBeTruthy();
  });

  it("calls onApplyStyle with the style object when a named style is clicked", async () => {
    const onApplyStyle = vi.fn();
    const named = [{ id: "s1", name: "Highlight", style: { background: "#ff0" } }];
    render(
      <StylesPanel
        rules={[]}
        markers={[]}
        namedStyles={named}
        onAddRule={noop}
        onDeleteRule={noop}
        onSaveStyle={noop}
        onApplyStyle={onApplyStyle}
        onDeleteStyle={noop}
      />,
    );
    const highlightRow = screen.getByRole("button", { name: "Highlight" });
    await userEvent.click(highlightRow);
    expect(onApplyStyle).toHaveBeenCalledWith({ background: "#ff0" });
  });
});

describe("HistoryPanel (interaction)", () => {
  it("calls onSaveNow when the 'Save version now' button is clicked", async () => {
    const onSaveNow = vi.fn();
    render(
      <HistoryPanel
        versions={[]}
        onSaveNow={onSaveNow}
        onPlay={noop}
        onRestore={noop}
        onClose={noop}
      />,
    );
    const saveBtn = screen.getByRole("button", { name: /Save version now/ });
    await userEvent.click(saveBtn);
    expect(onSaveNow).toHaveBeenCalled();
  });

  it("calls onRestore when a Restore button is clicked", async () => {
    const onRestore = vi.fn();
    render(
      <HistoryPanel
        versions={[
          { id: "v1", ts: Date.now(), title: "Saved", nodeCount: 4 },
          { id: "v2", ts: Date.now() - 60_000, title: "Earlier", nodeCount: 3 },
        ]}
        onSaveNow={noop}
        onPlay={noop}
        onRestore={onRestore}
        onClose={noop}
      />,
    );
    const restoreButtons = screen.getAllByRole("button", { name: "Restore" });
    await userEvent.click(restoreButtons[0]);
    expect(onRestore).toHaveBeenCalledWith("v1");
  });
});

// Interaction smoke: confirm the panels are actually wired to their callbacks. These also pin the
// user-facing behaviour the Phase-D refactor must preserve (clicking a row picks it, typing filters,
// Restore restores the right version, picking a shape styles the node).
describe("panel interactions", () => {
  it("OutlinePanel: clicking a row calls onPick with that node id", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<OutlinePanel root={sampleRoot()} filter="" onFilterChange={noop} onPick={onPick} />);
    await user.click(screen.getByRole("button", { name: /Research/ }));
    expect(onPick).toHaveBeenCalledWith("a");
  });

  it("OutlinePanel: typing in the filter box reports each change", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <OutlinePanel root={sampleRoot()} filter="" onFilterChange={onFilterChange} onPick={noop} />,
    );
    await user.type(screen.getByLabelText("Filter outline"), "ab");
    expect(onFilterChange).toHaveBeenCalledTimes(2); // one per keystroke
    expect(onFilterChange).toHaveBeenLastCalledWith("b"); // controlled input stays "" → last char
  });

  it("HistoryPanel: clicking a version's Restore calls onRestore with its id", async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    render(
      <HistoryPanel
        versions={[{ id: "v1", ts: Date.now(), title: "Now", nodeCount: 4 }]}
        onSaveNow={noop}
        onPlay={noop}
        onRestore={onRestore}
        onClose={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(onRestore).toHaveBeenCalledWith("v1");
  });

  it("StyleBar: picking a shape calls onStyle with that shape patch", async () => {
    const user = userEvent.setup();
    const onStyle = vi.fn();
    render(<StyleBar onStyle={onStyle} />);
    await user.click(screen.getByRole("button", { name: /Diamond/ }));
    expect(onStyle).toHaveBeenCalledTimes(1);
    expect(onStyle.mock.calls[0][0]).toMatchObject({ shape: "diamond" });
  });
});
