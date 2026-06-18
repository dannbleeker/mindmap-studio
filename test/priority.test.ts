import { describe, expect, it } from "vitest";
import { priorityColor, priorityLabel } from "../src/priority";

// The picker uses the 1–3 High/Med/Low scheme, but TaskInfo.priority is modelled 1..9 (MindManager's
// range) so an imported map can carry 4–9. priorityLabel/priorityColor must cover the whole range and
// never fall back to a meaningless "?" / grey #888.
describe("priority label + colour (full 1–9 range, never '?')", () => {
  it("keeps the 1–3 High/Med/Low scheme and its colours", () => {
    expect(priorityLabel(1)).toBe("High");
    expect(priorityLabel(2)).toBe("Med");
    expect(priorityLabel(3)).toBe("Low");
    expect(priorityColor(1)).toBe("#e23b3b");
    expect(priorityColor(3)).toBe("#3b8bd4");
  });

  it("renders an imported 4–9 priority as its number on a neutral badge — not '?'", () => {
    for (const p of [4, 5, 6, 7, 8, 9]) {
      expect(priorityLabel(p)).toBe(String(p));
      expect(priorityLabel(p)).not.toBe("?");
      expect(priorityColor(p)).toBe("#6b7280");
    }
  });
});
