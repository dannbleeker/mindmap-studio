import { describe, expect, it } from "vitest";
import { timeAgo } from "../src/ui";

const NOW = 1_700_000_000_000;
const ago = (ms: number) => timeAgo(NOW - ms, NOW);

describe("timeAgo", () => {
  it("uses coarse, human buckets", () => {
    expect(ago(5_000)).toBe("just now");
    expect(ago(2 * 60_000)).toBe("2 min ago");
    expect(ago(2 * 3_600_000)).toBe("2 h ago");
    expect(ago(3 * 86_400_000)).toBe("3 d ago");
  });

  it("falls back to a date past a week", () => {
    const out = ago(30 * 86_400_000);
    expect(out).not.toMatch(/ago|just now/);
    expect(out.length).toBeGreaterThan(0);
  });
});
