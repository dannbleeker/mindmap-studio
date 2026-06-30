// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchResults } from "../src/components/SearchResults";
import type { LibraryHit } from "../src/search";

const hit = (over: Partial<LibraryHit> = {}): LibraryHit => ({
  mapId: "m1",
  mapTitle: "Roadmap",
  nodeId: "n1",
  topic: "Ship it",
  path: [],
  ...over,
});

const u = userEvent.setup();

describe("SearchResults", () => {
  it("shows 'No matches.' for an empty hit list", () => {
    render(<SearchResults hits={[]} onPick={vi.fn()} />);
    expect(screen.getByText("No matches.")).toBeTruthy();
  });

  it("renders topic, map, breadcrumb path and a note snippet; picks the clicked hit", async () => {
    const onPick = vi.fn();
    const h = hit({
      topic: "Beta",
      path: ["Plan", "Marketing"],
      snippet: "…quota and pipeline notes…",
    });
    render(<SearchResults hits={[h]} onPick={onPick} />);
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("— Roadmap")).toBeTruthy();
    expect(screen.getByText("Plan › Marketing")).toBeTruthy();
    expect(screen.getByText("…quota and pipeline notes…")).toBeTruthy();
    await u.click(screen.getByText("Beta"));
    expect(onPick).toHaveBeenCalledWith(h);
  });

  it("omits the breadcrumb for a root hit and shows no snippet when absent", () => {
    const { container } = render(<SearchResults hits={[hit()]} onPick={vi.fn()} />);
    // One row, with the topic + map but no extra context spans.
    expect(container.querySelectorAll("li").length).toBe(1);
    expect(screen.queryByText("›")).toBeNull();
  });

  it("caps at 50 rows and shows an overflow hint", () => {
    const many = Array.from({ length: 63 }, (_, i) => hit({ nodeId: `n${i}`, topic: `T${i}` }));
    render(<SearchResults hits={many} onPick={vi.fn()} />);
    expect(screen.getByText(/\+13 more — refine your search/)).toBeTruthy();
  });
});
