import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MindMapDoc } from "../src/model/types";
import { Presentation } from "../src/present/Presentation";

// Presentation — the ▶ Present overlay. A prop-driven component (its slide/presenter logic lives in
// the already-covered slides.ts / presenter.ts), so the test mounts it and drives the controls,
// keyboard, and the presenter sidebar.

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "m1",
  title: "Talk",
  root: {
    id: "root",
    topic: "My Talk",
    note: "intro",
    children: [
      {
        id: "a",
        topic: "First branch",
        note: "say something about first",
        children: [
          { id: "a1", topic: "Point A", children: [{ id: "a1a", topic: "Sub A", children: [] }] },
          { id: "a2", topic: "Point B", children: [] },
        ],
      },
      { id: "b", topic: "Second branch", children: [{ id: "b1", topic: "Point C", children: [] }] },
    ],
  },
};
// slides = [overview, "First branch", "Second branch"]  → length 3

const heading = () => screen.getByRole("heading", { level: 1 }).textContent;

describe("Presentation overlay", () => {
  it("renders the overview slide then navigates branches via the buttons", () => {
    render(<Presentation doc={doc} onExit={vi.fn()} />);
    // Overview slide: root heading + each branch listed.
    expect(heading()).toBe("My Talk");
    expect(screen.getByText("First branch")).toBeTruthy();
    expect(screen.getByText("Second branch")).toBeTruthy();
    expect(screen.getByText("1 / 3")).toBeTruthy();

    const prev = screen.getByRole("button", { name: /Prev/ });
    const next = screen.getByRole("button", { name: /Next/ });
    expect((prev as HTMLButtonElement).disabled).toBe(true); // at the start

    fireEvent.click(next);
    expect(heading()).toBe("First branch"); // branch slide → Bullets
    expect(screen.getByText("Point A")).toBeTruthy();
    expect(screen.getByText("Sub A")).toBeTruthy(); // recursive Bullets

    fireEvent.click(next);
    expect(heading()).toBe("Second branch");
    expect((screen.getByRole("button", { name: /Next/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Prev/ }));
    expect(heading()).toBe("First branch");
  });

  it("supports keyboard navigation, presenter toggle, and Escape-to-exit", () => {
    const onExit = vi.fn();
    render(<Presentation doc={doc} onExit={onExit} />);

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(heading()).toBe("First branch");
    fireEvent.keyDown(document, { key: " " }); // Space also advances
    expect(heading()).toBe("Second branch");
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(heading()).toBe("First branch");

    // 'p' toggles the presenter sidebar.
    expect(screen.queryByRole("complementary", { name: "Presenter view" })).toBeNull();
    fireEvent.keyDown(document, { key: "p" });
    expect(screen.getByRole("complementary", { name: "Presenter view" })).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("presenter sidebar shows notes / no-notes, agenda, and jumps on click", () => {
    render(<Presentation doc={doc} onExit={vi.fn()} />);
    // Turn on presenter view via the button (covers aria-pressed + ctrlOnStyle path).
    fireEvent.click(screen.getByRole("button", { name: /Presenter view/ }));
    const aside = screen.getByRole("complementary", { name: "Presenter view" });
    expect(within(aside).getByText("Speaker notes")).toBeTruthy();
    expect(within(aside).getByText(/Agenda/)).toBeTruthy();
    expect(within(aside).getByText("Next up")).toBeTruthy();

    // Jump to the "Second branch" agenda row → it has no note → "No notes" branch renders.
    fireEvent.click(within(aside).getByRole("button", { name: /Second branch/ }));
    expect(heading()).toBe("Second branch");
    expect(within(aside).getByText("No notes for this slide.")).toBeTruthy();
  });
});
