import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Kanban } from "../src/Kanban";
import type { MindMapDoc } from "../src/model/types";

// Kanban — the read-only "topics by tag" board overlay. Renders columns from boardColumns(doc);
// clicking a card jumps to that topic, the close button dismisses the board.

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
    render(<Kanban doc={doc} onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("#work")).toBeTruthy();
    expect(screen.getByText("Untagged")).toBeTruthy();
    // The #work column holds Task A; Untagged holds Root + Idea B.
    expect(screen.getByText("Task A")).toBeTruthy();
    expect(screen.getByText("Idea B")).toBeTruthy();
  });

  it("jumps to a topic when its card is clicked", async () => {
    const onPick = vi.fn();
    render(<Kanban doc={doc} onPick={onPick} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText("Task A"));
    expect(onPick).toHaveBeenCalledWith("a");
  });

  it("closes via the close button", async () => {
    const onClose = vi.fn();
    render(<Kanban doc={doc} onPick={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close board/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
