// Render-smoke tests for the left-rail panels in src/Panels.tsx. This is the safety net for the
// later Panels refactor (Phase D): each panel must mount without throwing AND show a known piece of
// user-visible content. Assertions target visible text / roles / labels — NOT internal structure —
// so they keep passing after the panels are rebuilt on shared primitives.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  FilterPanel,
  HistoryPanel,
  InfoPanel,
  MarkerTagIndex,
  type NamedStyle,
  OutlinePanel,
  StyleBar,
  StylesPanel,
} from "../src/Panels";
import type { SelectedNode } from "../src/mindmap";
import type { MapNode } from "../src/model/types";

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

  const renderInfo = (sel: SelectedNode | null, n: MapNode | null) =>
    render(
      <InfoPanel
        selected={sel}
        node={n}
        noteDraft={n?.note ?? ""}
        onNoteChange={noop}
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
        onClose={noop}
      />,
    );

  it("shows a placeholder when nothing is selected", () => {
    renderInfo(null, null);
    expect(screen.getByText(/Select a node to see and edit its details/)).toBeTruthy();
  });

  it("renders the inspector for the selected node (note draft + a Close control)", () => {
    renderInfo(selected, node);
    expect(screen.getByRole("button", { name: /Close/ })).toBeTruthy();
    expect(screen.getByDisplayValue("interview users")).toBeTruthy();
  });
});

describe("StyleBar", () => {
  it("renders the per-topic style controls (a Shape label + shape buttons)", () => {
    render(<StyleBar onStyle={noop} />);
    expect(screen.getByText("Shape")).toBeTruthy();
    // the diamond shape picker is present (asserted by its title/accessible name)
    expect(screen.getByRole("button", { name: /Diamond/ })).toBeTruthy();
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
