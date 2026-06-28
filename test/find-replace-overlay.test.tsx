import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FindReplaceOverlay } from "../src/components/FindReplaceOverlay";
import type { ToolbarFind } from "../src/components/Toolbar";

afterEach(cleanup);

function makeFind(over: Partial<ToolbarFind> = {}): ToolbarFind {
  return {
    query: "",
    setQuery: vi.fn(),
    replaceWith: "",
    setReplaceWith: vi.fn(),
    replaceScope: "topics",
    setReplaceScope: vi.fn(),
    useRegex: false,
    setUseRegex: vi.fn(),
    matchCase: false,
    setMatchCase: vi.fn(),
    matchInfo: "",
    runSearch: vi.fn((e: { preventDefault: () => void }) => e.preventDefault()),
    runReplace: vi.fn(),
    ...over,
  };
}

describe("FindReplaceOverlay", () => {
  it("submits the find form and runs replace", async () => {
    const u = userEvent.setup();
    const find = makeFind();
    render(<FindReplaceOverlay find={find} onClose={vi.fn()} />);
    const input = screen.getByLabelText("Find node");
    // The find row is a <form> with no submit button (implicit submit), so submit it directly.
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(find.runSearch).toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: /replace all/i }));
    expect(find.runReplace).toHaveBeenCalled();
  });

  it("toggles match-case and regex", async () => {
    const u = userEvent.setup();
    const find = makeFind();
    render(<FindReplaceOverlay find={find} onClose={vi.fn()} />);
    await u.click(screen.getByRole("button", { name: /match case/i }));
    expect(find.setMatchCase).toHaveBeenCalledWith(true);
    await u.click(screen.getByRole("button", { name: /regular expression/i }));
    expect(find.setUseRegex).toHaveBeenCalledWith(true);
  });

  it("closes on the × button and on Escape", async () => {
    const u = userEvent.setup();
    const onClose = vi.fn();
    render(<FindReplaceOverlay find={makeFind()} onClose={onClose} />);
    await u.click(screen.getByRole("button", { name: /close find/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    // Escape on the Find input bubbles to the overlay's keydown handler.
    fireEvent.keyDown(screen.getByLabelText("Find node"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
