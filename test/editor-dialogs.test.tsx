// @vitest-environment jsdom
//
// DialogHost renders the editor's themed prompt/confirm (editorPrompt / editorConfirm), the drop-in
// replacement for the native window.prompt/confirm on the canvas + panels. The helpers are imperative
// and promise-based, so each test awaits the resolved value after driving the dialog.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DialogHost, editorConfirm, editorPrompt } from "../src/components/editorDialogs";

const u = userEvent.setup();

describe("editor dialogs", () => {
  it("editorConfirm resolves true on confirm", async () => {
    render(<DialogHost />);
    const result = editorConfirm({ title: "Delete this relationship?", confirmText: "Delete" });
    await waitFor(() => screen.getByText("Delete this relationship?"));
    await u.click(screen.getByRole("button", { name: "Delete" }));
    expect(await result).toBe(true);
  });

  it("editorConfirm resolves false on cancel", async () => {
    render(<DialogHost />);
    const result = editorConfirm({ title: "Delete this relationship?" });
    await waitFor(() => screen.getByText("Delete this relationship?"));
    await u.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await result).toBe(false);
  });

  it("editorPrompt resolves the entered text, seeded with the default value", async () => {
    render(<DialogHost />);
    const result = editorPrompt({ title: "Summary label", defaultValue: "Risks" });
    const input = (await screen.findByLabelText("Summary label")) as HTMLInputElement;
    expect(input.value).toBe("Risks"); // seeded from defaultValue
    await u.clear(input);
    await u.type(input, "Opportunities");
    await u.click(screen.getByRole("button", { name: "OK" }));
    expect(await result).toBe("Opportunities");
  });

  it("editorPrompt resolves null on cancel", async () => {
    render(<DialogHost />);
    const result = editorPrompt({ title: "Name this view" });
    await screen.findByLabelText("Name this view");
    await u.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await result).toBeNull();
  });
});
