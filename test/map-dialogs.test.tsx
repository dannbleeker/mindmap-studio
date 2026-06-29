// @vitest-environment jsdom
//
// MapDialogs renders the themed rename + delete-confirm dialogs (replacing the native prompt/confirm).
// StartScreen owns the `pending` state; this drives the dialogs against a real fake-indexeddb store.
import "fake-indexeddb/auto";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapDialogs } from "../src/components/start/MapDialogs";
import type { MindMapDoc } from "../src/model/types";
import { loadMap, saveMap } from "../src/store/mapStore";

const docOf = (id: string, title: string): MindMapDoc => ({
  schemaVersion: 1,
  id,
  title,
  root: { id: "r", topic: title, children: [] },
});

const u = userEvent.setup();
afterEach(() => vi.restoreAllMocks());

describe("MapDialogs", () => {
  it("renames a map through the themed dialog (seeded with the current title)", async () => {
    await saveMap(docOf("m1", "Old"));
    const onClose = vi.fn();
    const onDone = vi.fn();
    render(
      <MapDialogs
        pending={{ kind: "rename", id: "m1", title: "Old" }}
        onClose={onClose}
        onDone={onDone}
      />,
    );
    const input = screen.getByLabelText(/new map name/i) as HTMLInputElement;
    expect(input.value).toBe("Old"); // seeded from the current title
    await u.clear(input);
    await u.type(input, "Renamed");
    await u.click(screen.getByRole("button", { name: "Rename" }));
    // onClose is the last call in the async confirm handler — waiting for it means the store op +
    // onDone already ran (u.click doesn't await the handler's promise).
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect((await loadMap("m1"))?.title).toBe("Renamed");
    expect(onDone).toHaveBeenCalled();
  });

  it("deletes a map through the themed confirm", async () => {
    await saveMap(docOf("m2", "Doomed"));
    const onClose = vi.fn();
    const onDone = vi.fn();
    render(
      <MapDialogs
        pending={{ kind: "delete", id: "m2", title: "Doomed" }}
        onClose={onClose}
        onDone={onDone}
      />,
    );
    expect(screen.getByText(/Delete .Doomed/)).toBeTruthy();
    await u.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(await loadMap("m2")).toBeNull();
    expect(onDone).toHaveBeenCalled();
  });

  it("cancel closes without changing the map", async () => {
    await saveMap(docOf("m3", "Keep"));
    const onClose = vi.fn();
    const onDone = vi.fn();
    render(
      <MapDialogs
        pending={{ kind: "rename", id: "m3", title: "Keep" }}
        onClose={onClose}
        onDone={onDone}
      />,
    );
    await u.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect((await loadMap("m3"))?.title).toBe("Keep");
  });

  it("renders nothing when there's no pending action", () => {
    const { container } = render(<MapDialogs pending={null} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(container.querySelector("dialog")).toBeNull();
  });
});
