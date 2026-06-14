import { describe, expect, it } from "vitest";
import { addDaysISO, formatDateShort, isDueSoon, isOverdue } from "../src/taskDate";

const TODAY = "2026-06-14";

describe("formatDateShort", () => {
  it("formats an ISO date as 'Mon D'", () => {
    expect(formatDateShort("2026-06-20")).toBe("Jun 20");
    expect(formatDateShort("2026-01-05")).toBe("Jan 5");
  });
  it("returns the input unchanged when it isn't an ISO date", () => {
    expect(formatDateShort("whenever")).toBe("whenever");
  });
});

describe("addDaysISO", () => {
  it("adds days, rolling over months and years", () => {
    expect(addDaysISO("2026-06-14", 7)).toBe("2026-06-21");
    expect(addDaysISO("2026-06-28", 7)).toBe("2026-07-05");
    expect(addDaysISO("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDaysISO("2026-06-14", -1)).toBe("2026-06-13");
  });
});

describe("isOverdue", () => {
  it("is true only for a past due date on an unfinished task", () => {
    expect(isOverdue("2026-06-13", 0.5, TODAY)).toBe(true);
    expect(isOverdue("2026-06-13", 1, TODAY)).toBe(false); // done
    expect(isOverdue("2026-06-14", 0, TODAY)).toBe(false); // due today, not past
    expect(isOverdue("2026-06-20", 0, TODAY)).toBe(false); // future
    expect(isOverdue(undefined, 0, TODAY)).toBe(false); // no date
    expect(isOverdue("2026-06-13", undefined, TODAY)).toBe(true); // no progress = not done
  });
});

describe("isDueSoon", () => {
  it("is true for an unfinished task due within the window (today..+7)", () => {
    expect(isDueSoon("2026-06-14", 0, TODAY)).toBe(true); // today
    expect(isDueSoon("2026-06-21", 0, TODAY)).toBe(true); // +7 edge
    expect(isDueSoon("2026-06-22", 0, TODAY)).toBe(false); // past the window
    expect(isDueSoon("2026-06-13", 0, TODAY)).toBe(false); // already overdue, not "soon"
    expect(isDueSoon("2026-06-16", 1, TODAY)).toBe(false); // done
    expect(isDueSoon(undefined, 0, TODAY)).toBe(false);
  });
  it("honours a custom window (days)", () => {
    expect(isDueSoon("2026-06-17", 0, TODAY, 3)).toBe(true); // within 3 days
    expect(isDueSoon("2026-06-18", 0, TODAY, 3)).toBe(false); // outside 3 days
  });
});
