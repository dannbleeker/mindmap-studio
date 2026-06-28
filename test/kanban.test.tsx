import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Kanban } from "../src/Kanban";
import type { MindMapDoc } from "../src/model/types";

// Kanban — the "topics by tag" board overlay. Renders columns from boardColumns(doc); clicking a card
// jumps to that topic, the close button dismisses the board, and dragging a card to another column
// re-tags the topic.

/** A minimal DataTransfer stand-in (jsdom's drag events don't carry one) shared across a drag. */
function fakeDataTransfer() {
  const store = new Map<string, string>();
  return {
    setData: (t: string, v: string) => store.set(t, v),
    getData: (t: string) => store.get(t) ?? "",
    types: ["application/x-mm-card"],
    dropEffect: "",
    effectAllowed: "",
  };
}

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "Board doc",
  root: {
    id: "root",
    topic: "Root",
    children: [
      {
        id: "a",
        topic: "Task A",
        tags: ["work"],
        task: { progress: 0.5, due: "2026-01-01" },
        children: [],
      },
      { id: "b", topic: "Idea B", children: [] },
    ],
  },
};

describe("Kanban board", () => {
  it("renders a column per tag plus an Untagged column", () => {
    render(<Kanban doc={doc} onPick={vi.fn()} onRetag={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("#work")).toBeTruthy();
    expect(screen.getByText("Untagged")).toBeTruthy();
    // The #work column holds Task A; Untagged holds Root + Idea B.
    expect(screen.getByText("Task A")).toBeTruthy();
    expect(screen.getByText("Idea B")).toBeTruthy();
  });

  it("jumps to a topic when its card is clicked", async () => {
    const onPick = vi.fn();
    render(<Kanban doc={doc} onPick={onPick} onRetag={vi.fn()} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText("Task A"));
    expect(onPick).toHaveBeenCalledWith("a");
  });

  it("closes via the close button", async () => {
    const onClose = vi.fn();
    render(<Kanban doc={doc} onPick={vi.fn()} onRetag={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close board/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("re-tags a topic when its card is dropped on another column (I6)", () => {
    const onRetag = vi.fn();
    render(<Kanban doc={doc} onPick={vi.fn()} onRetag={onRetag} onClose={vi.fn()} />);
    const dt = fakeDataTransfer();
    // Drag Task A (in the "work" column) and drop it on the Untagged column (its header's parent div
    // carries the onDrop handler).
    fireEvent.dragStart(screen.getByText("Task A").closest("button") as HTMLElement, {
      dataTransfer: dt,
    });
    const untaggedColumn = screen.getByText("Untagged").parentElement as HTMLElement;
    fireEvent.dragOver(untaggedColumn, { dataTransfer: dt });
    fireEvent.drop(untaggedColumn, { dataTransfer: dt });
    expect(onRetag).toHaveBeenCalledWith("a", "work", "");
  });
});
