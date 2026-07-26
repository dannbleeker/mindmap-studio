// `formatDateShort` must not slip a day west of Greenwich.
//
// This lives in its OWN file because it sets `process.env.TZ` before importing the module under test —
// the rest of the date suite does local-calendar arithmetic against a fixed `TODAY`, and moving the
// zone under it would shift those expectations for unrelated reasons.
//
// Why it matters, and why the obvious fixes don't work — all three verified in `America/New_York`:
//   `new Date("2026-06-20")`                      → UTC midnight → formats as "Jun 19"  ✗
//   `new Date(Date.UTC(2026, 5, 20))`             → UTC midnight → formats as "Jun 19"  ✗
//   `new Date(2026, 5, 20)`                       → local midnight → "Jun 20"           ✓
//
// The second one is the trap: building a UTC instant looks like the fix, but `Intl.DateTimeFormat`
// formats in the LOCAL zone unless given `timeZone`, so it just moves the bug. An earlier draft of this
// change shipped exactly that, with a comment claiming it was safe — the claim was only caught because
// this test was checked for whether it could fail at all, on a UTC+1 machine where it could not.
export {}; // makes this a module, so the top-level await below is legal

process.env.TZ = "America/New_York";

const { formatDateShort } = await import("../src/taskDate");
const { describe, expect, it } = await import("vitest");

describe("formatDateShort in a negative-offset timezone", () => {
  it("renders the calendar date it was given, not the day before", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("America/New_York");
    expect(formatDateShort("2026-06-20")).toBe("Jun 20");
    expect(formatDateShort("2026-01-01")).toBe("Jan 1");
    expect(formatDateShort("2026-12-31")).toBe("Dec 31");
  });
});
