import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppTips } from "../src/components/start/AppTips";
import { MapCard, type MapEntry } from "../src/components/start/MapCard";
import { About } from "../src/components/start/sections/About";
import { AllMaps } from "../src/components/start/sections/AllMaps";
import { Recent } from "../src/components/start/sections/Recent";
import { Templates } from "../src/components/start/sections/Templates";
import type { StartContext } from "../src/components/start/types";

// Library-backed Start sections (All maps / Recent) + the leaf cards (MapCard / Templates) and the
// static About blurb. AllMaps/Recent read the library through useLibrary (IndexedDB); we mock that
// hook so the views are tested against fixed entries without driving the store.

let libEntries: MapEntry[] = [];
vi.mock("../src/components/start/useLibrary", () => ({
  useLibrary: () => libEntries,
}));

const mkCtx = (over: Partial<StartContext> = {}): StartContext => ({
  onOpen: vi.fn(),
  onImportFiles: vi.fn(),
  go: vi.fn(),
  libraryRev: 0,
  onLibraryChange: vi.fn(),
  ...over,
});

const u = userEvent.setup();

afterEach(() => {
  libEntries = [];
});

describe("MapCard", () => {
  const entry: MapEntry = { id: "m1", title: "Roadmap", nodeCount: 1, updatedAt: undefined };

  it("renders title + singular meta and opens via the thumbnail", async () => {
    const onAction = vi.fn();
    render(<MapCard entry={entry} onAction={onAction} />);
    expect(screen.getByText("Roadmap")).toBeTruthy();
    expect(screen.getByText("1 node")).toBeTruthy(); // singular, no timestamp
    await u.click(screen.getByRole("button", { name: /open roadmap/i }));
    expect(onAction).toHaveBeenCalledWith("open", entry);
  });

  it("falls back to (untitled) and fires every kebab action", async () => {
    const onAction = vi.fn();
    const e: MapEntry = { id: "m2", title: "", nodeCount: 3, updatedAt: 1 };
    render(<MapCard entry={e} onAction={onAction} />);
    expect(screen.getByText("(untitled)")).toBeTruthy();
    expect(screen.getByText(/^3 nodes ·/)).toBeTruthy(); // plural + timeAgo appended
    for (const label of ["Rename", "Duplicate", "Export…", "Delete"]) {
      await u.click(screen.getByRole("button", { name: label }));
    }
    expect(onAction.mock.calls.map((c) => c[0])).toEqual([
      "rename",
      "duplicate",
      "export",
      "delete",
    ]);
  });

  it("draws real branch spokes in the thumbnail when the entry carries branch colours", () => {
    const e: MapEntry = {
      id: "m3",
      title: "Colourful",
      nodeCount: 4,
      branches: ["#e8593c", "#3b8bd4"],
    };
    const { container } = render(<MapCard entry={e} onAction={vi.fn()} />);
    // One coloured spoke per real branch (circle fill + connecting line stroke) rather than a hash glyph.
    expect(container.querySelector('circle[fill="#e8593c"]')).toBeTruthy();
    expect(container.querySelector('line[stroke="#3b8bd4"]')).toBeTruthy();
  });

  it("shows the pinned indicator and toggles pin via the kebab", async () => {
    const onAction = vi.fn();
    const e: MapEntry = { id: "m4", title: "Important", nodeCount: 1, pinned: true };
    render(<MapCard entry={e} onAction={onAction} />);
    expect(screen.getByTitle("Pinned")).toBeTruthy(); // ★ indicator on a pinned card
    await u.click(screen.getByRole("button", { name: "Unpin" })); // pinned → the kebab reads "Unpin"
    expect(onAction).toHaveBeenCalledWith("pin", e);
  });
});

describe("AppTips", () => {
  it("opens the command palette from the ⌘K card (show, not just tell)", async () => {
    const onOpen = vi.fn();
    render(<AppTips onOpenCommandPalette={onOpen} />);
    await u.click(screen.getByRole("button", { name: /open the command palette/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    // The other tips stay static, non-interactive cards.
    expect(screen.queryByRole("button", { name: /right-click a topic/i })).toBeNull();
  });
});

describe("About section", () => {
  it("renders the local-first blurb and every resource link with its href", () => {
    render(<About />);
    expect(screen.getByRole("heading", { name: /About MindMap Studio/i })).toBeTruthy();
    const guide = screen.getByRole("link", { name: /User guide/i });
    expect(guide.getAttribute("href")).toBe("/user-guide.html");
    expect(guide.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("link", { name: /Source/i }).getAttribute("href")).toBe(
      "https://github.com/dannbleeker/mindmap-studio",
    );
    // All six resource links render.
    expect(screen.getAllByRole("link")).toHaveLength(6);
  });
});

describe("Templates section", () => {
  it("renders a card per non-blank template and opens one through buildTemplate", async () => {
    const ctx = mkCtx();
    render(<Templates ctx={ctx} />);
    expect(screen.queryByText("Blank", { selector: ".st-card-title" })).toBeNull(); // blank excluded
    await u.click(screen.getByRole("button", { name: /SWOT/i }));
    expect(ctx.onOpen).toHaveBeenCalledTimes(1);
    const [doc] = (ctx.onOpen as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(doc.root).toBeTruthy(); // a built template doc
  });

  it("filters by search query and shows the empty state when nothing matches", async () => {
    render(<Templates ctx={mkCtx()} />);
    await u.type(screen.getByPlaceholderText(/search templates/i), "swot");
    expect(screen.getByRole("button", { name: /SWOT/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Brainstorm/i })).toBeNull();
    await u.clear(screen.getByPlaceholderText(/search templates/i));
    await u.type(screen.getByPlaceholderText(/search templates/i), "zzzznope");
    expect(screen.getByText(/No templates match/i)).toBeTruthy();
  });
});

describe("AllMaps section", () => {
  const lib: MapEntry[] = [
    { id: "a", title: "Banana", nodeCount: 2, updatedAt: 100 },
    { id: "b", title: "Apple", nodeCount: 9, updatedAt: 200 },
  ];

  it("shows the empty state when the library is empty, with a templates path (UI-7)", async () => {
    const ctx = mkCtx();
    render(<AllMaps ctx={ctx} />);
    expect(screen.getByText(/No maps yet/i)).toBeTruthy();
    // The returning-but-empty state offers a guided path to templates, not just a blank canvas.
    await u.click(screen.getByRole("button", { name: /Browse templates/i }));
    expect(ctx.go).toHaveBeenCalledWith("templates");
  });

  it("counts maps, sorts by the chosen key, and toggles grid ↔ list", async () => {
    libEntries = lib;
    render(<AllMaps ctx={mkCtx()} />);
    expect(screen.getByText(/2 maps in your library/i)).toBeTruthy();

    // Default sort = recently edited (updatedAt desc) → Apple (200) before Banana (100).
    const titlesInGrid = () => screen.getAllByText(/Apple|Banana/).map((n) => n.textContent);
    expect(titlesInGrid()[0]).toBe("Apple");

    // Sort by name A–Z → Apple before Banana (still, but via the name path).
    await u.selectOptions(screen.getByLabelText(/Sort maps/i), "name");
    expect(titlesInGrid()[0]).toBe("Apple");
    // Sort by most nodes → Apple (9) before Banana (2).
    await u.selectOptions(screen.getByLabelText(/Sort maps/i), "nodes");
    expect(titlesInGrid()[0]).toBe("Apple");

    // Toggle to list view: rows render the title as a link + a node-count·date span.
    await u.click(screen.getByRole("button", { name: /List/i }));
    expect(screen.getByRole("button", { name: "Apple" })).toBeTruthy();
    expect(screen.getByText(/9 nodes ·/)).toBeTruthy(); // node count + last-edited date in the list row
  });

  it("floats pinned maps to the top regardless of the chosen sort", () => {
    libEntries = [
      { id: "a", title: "Apple", nodeCount: 9, updatedAt: 200 },
      { id: "b", title: "Banana", nodeCount: 2, updatedAt: 100, pinned: true },
    ];
    render(<AllMaps ctx={mkCtx()} />);
    // Banana is older + fewer nodes but pinned → it leads ahead of the more-recent Apple.
    const titles = screen.getAllByText(/Apple|Banana/).map((n) => n.textContent ?? "");
    expect(titles[0]).toMatch(/Banana/);
  });

  it("filters the library by a title search and shows a no-match state", async () => {
    libEntries = lib; // Banana, Apple
    render(<AllMaps ctx={mkCtx()} />);
    const box = screen.getByLabelText(/search your maps/i);
    await u.type(box, "app");
    expect(screen.getByText("Apple")).toBeTruthy();
    expect(screen.queryByText("Banana")).toBeNull();
    await u.clear(box);
    await u.type(box, "zzznope");
    expect(screen.getByText(/No maps match/i)).toBeTruthy();
  });
});

describe("Recent section", () => {
  it("shows the empty state with no maps", () => {
    render(<Recent ctx={mkCtx()} />);
    expect(screen.getByText(/No maps yet/i)).toBeTruthy();
  });

  it("groups maps by last-edited into finer buckets (Today / Earlier this week / Not yet saved)", () => {
    const now = Date.now();
    const DAY = 86_400_000;
    libEntries = [
      { id: "t", title: "Fresh", nodeCount: 1, updatedAt: now },
      { id: "w", title: "MidWeek", nodeCount: 1, updatedAt: now - 4 * DAY },
      { id: "n", title: "Unsaved", nodeCount: 1, updatedAt: undefined },
    ];
    render(<Recent ctx={mkCtx()} />);
    expect(screen.getByRole("heading", { name: "Today" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Earlier this week" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Not yet saved" })).toBeTruthy();
    expect(screen.getByText("Fresh")).toBeTruthy();
    expect(screen.getByText("MidWeek")).toBeTruthy();
  });
});
