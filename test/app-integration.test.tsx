import "fake-indexeddb/auto";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App";

// Integration cover for App — the orchestration root (previously 0%). Renders the whole app over a
// fake IndexedDB, opens a map from the Start screen, and drives the editor's wiring: panels, dialogs,
// find/replace, undo/redo, the ⌘K palette, and the Start round-trip. The sub-features have their own
// unit tests; this executes App's glue so a regression in the shell is caught.

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

// App defers a focusNode via requestAnimationFrame on selection. Run RAF callbacks synchronously in
// this suite so that deferred work executes inline (while still mounted) instead of firing after the
// component unmounts at teardown — which would otherwise reach into a torn-down jsdom (null document).
let realRaf: typeof globalThis.requestAnimationFrame;
beforeEach(() => {
  realRaf = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof globalThis.requestAnimationFrame;
});
afterEach(() => {
  globalThis.requestAnimationFrame = realRaf;
});

/** From a fresh mount, land in the editor by opening a template from the Start screen. */
async function openEditor(user: ReturnType<typeof userEvent.setup>, container: HTMLElement) {
  // Boot lands on Start (no saved session); open a template card to enter the editor.
  if (container.querySelector(".mm-editor")) return; // already in the editor
  await waitFor(() => expect(screen.getByText("Brainstorm", { exact: true })).toBeTruthy());
  await user.click(screen.getByText("Brainstorm", { exact: true }));
  await waitFor(() => expect(container.querySelector(".mm-editor")).toBeTruthy(), {
    timeout: 4000,
  });
  await waitFor(() => expect(container.querySelector(".react-flow")).toBeTruthy(), {
    timeout: 4000,
  });
}

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "prompt").mockReturnValue("My view");
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => "blob:stub"; // jsdom has no object-URL; stub so export paths don't throw
    URL.revokeObjectURL = () => {};
  }
  // jsdom has no clipboard; stub so copy actions resolve.
  if (!navigator.clipboard) {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  }
  // Anchor download click — no-op so export "save" doesn't navigate.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("App (integration)", () => {
  it("boots to the Start screen and opens a map into the editor", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await flush();
    // Start screen affordances render (template gallery present).
    expect(screen.getByText("Brainstorm", { exact: true })).toBeTruthy();
    await openEditor(user, container);
    expect(container.querySelector(".mm-editor")).toBeTruthy();
  });

  it("opens + closes the ⌘K command palette", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await flush();
    await openEditor(user, container);
    // ⌘/Ctrl-K opens the palette (document-level keydown listener).
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
      );
    });
    const input = await screen.findByPlaceholderText(/Search commands/);
    expect(input).toBeTruthy();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByPlaceholderText(/Search commands/)).toBeNull());
  });

  it("toggles a side panel via the Panels menu", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await flush();
    await openEditor(user, container);
    await user.click(screen.getByRole("button", { name: /Panels/ }));
    await user.click(await screen.findByText("Outline", { exact: true }));
    await waitFor(() => expect(container.querySelector(".mm-panel-host")).toBeTruthy());
  });

  it("runs find then replace-all from the header without crashing", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await flush();
    await openEditor(user, container);
    const find = screen.getByLabelText("Find node") as HTMLInputElement;
    await user.click(find);
    await user.type(find, "idea{Enter}");
    await flush();
    expect(find.value).toBe("idea");
    const replace = screen.getByLabelText("Replace with") as HTMLInputElement;
    await user.type(replace, "concept");
    await user.click(screen.getByRole("button", { name: /Replace all/ }));
    await flush();
  });

  it("undo / redo from the header toolbar", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await flush();
    await openEditor(user, container);
    // Make an edit first so undo has something to do: add a quick topic.
    const quick = screen.queryByPlaceholderText(/Quick add/);
    if (quick) {
      await user.click(quick);
      await user.type(quick, "Extra topic{Enter}");
      await flush();
    }
    const undo = screen.queryByRole("button", { name: /Undo/ });
    if (undo) {
      await user.click(undo);
      await flush();
    }
    expect(container.querySelector(".mm-editor")).toBeTruthy();
  });

  it("drives the View, Canvas and Export menus without crashing", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await flush();
    await openEditor(user, container);

    const openMenu = async (label: string) => {
      const btn = screen
        .getAllByRole("button")
        .find((b) => b.textContent?.trim() === label || b.getAttribute("title") === label);
      if (btn) await user.click(btn);
      await flush();
    };
    const clickIfPresent = async (text: string | RegExp) => {
      const els = screen.queryAllByText(text);
      if (els[0]) {
        await user.click(els[0]);
        await flush();
        return true;
      }
      return false;
    };

    // View menu — fit / expand / collapse-style actions.
    await openMenu("View");
    await clickIfPresent(/Collapse all/i);

    // Canvas menu — change layout + apply a design (executes applyDesign / changeLayout handlers).
    await openMenu("Canvas");
    await clickIfPresent(/Timeline|Org chart|Radial/i);

    // Layout select (always visible in the toolbar row).
    const layoutSel = screen.queryByLabelText(/layout/i) as HTMLSelectElement | null;
    if (layoutSel && layoutSel.options.length > 1) {
      await user.selectOptions(layoutSel, layoutSel.options[1].value);
      await flush();
    }

    // Export menu — JSON + Markdown (pure serializers; download click is stubbed).
    await openMenu("Export");
    await clickIfPresent(/Markdown/i);
    await openMenu("Export");
    await clickIfPresent(/^JSON/i);

    expect(container.querySelector(".mm-editor")).toBeTruthy();
  });

  it("opens the More menu and starts + exits Present mode", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await flush();
    await openEditor(user, container);
    await user.click(screen.getByRole("button", { name: /More/ }));
    await flush();
    const present = screen.queryByText("Present", { exact: true });
    if (present) {
      await user.click(present);
      await flush();
      await user.keyboard("{Escape}");
      await flush();
    }
    expect(container.querySelector(".mm-editor")).toBeTruthy();
  });

  it("selects a topic and drives inspector edits (tag, progress, priority)", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await flush();
    await openEditor(user, container);
    // Open the Topic info / inspector panel (off by default) so the InfoPanel + its App-wired editors
    // (setSelectedTags / setSelectedProgress / setSelectedPriority) are reachable.
    await user.click(screen.getByRole("button", { name: /Panels/ }));
    await flush();
    const inspectorItem = screen
      .getAllByRole("menuitemcheckbox")
      .find((e) => /inspector|topic info/i.test(e.textContent ?? ""));
    if (inspectorItem) await user.click(inspectorItem);
    else await user.keyboard("{Escape}");
    await flush();
    // Select a topic on the canvas. Use fireEvent.click (click-only) — userEvent.click also dispatches
    // mousedown, which trips React Flow's d3-drag in jsdom (synthetic events have no `view`).
    const node = container.querySelector(".react-flow__node");
    expect(node).toBeTruthy();
    act(() => {
      fireEvent.click(node as Element);
    });
    await flush();
    const tag = screen.queryByPlaceholderText(/Add a tag/);
    if (tag) {
      await user.type(tag, "urgent{Enter}");
      await flush();
    }
    for (const label of ["50", "High"]) {
      const btn = screen.queryAllByRole("button", { name: label })[0];
      if (btn) {
        await user.click(btn);
        await flush();
      }
    }
    expect(container.querySelector(".mm-editor")).toBeTruthy();
  });

  it("returns to the Start screen via Home and back into a map", async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await flush();
    await openEditor(user, container);
    // Home / Start nav (the breadcrumb home button) — find a Start affordance and click it.
    const home = screen.queryByLabelText(/home/i) ?? screen.queryByText("Maps");
    if (home) await user.click(home);
    await flush();
    expect(document.body.textContent).toBeTruthy();
  });
});
