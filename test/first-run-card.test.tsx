import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FirstRunCard } from "../src/components/FirstRunCard";

describe("FirstRunCard (#13)", () => {
  it("renders the three tips and dismisses on the close button", () => {
    const onDismiss = vi.fn();
    render(<FirstRunCard onDismiss={onDismiss} />);
    expect(screen.getByText("3 things to try")).toBeTruthy();
    expect(screen.getByText(/rename it/i)).toBeTruthy();
    expect(screen.getByText(/to add a child/i)).toBeTruthy();
    expect(screen.getByText(/for anything/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
