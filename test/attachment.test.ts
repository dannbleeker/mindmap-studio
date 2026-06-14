import { describe, expect, it } from "vitest";
import { formatBytes } from "../src/io/attachment";

describe("formatBytes", () => {
  it("formats bytes / KB / MB / GB with one decimal under 10", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(10 * 1024)).toBe("10 KB"); // at the ≥10 boundary, no decimal
    expect(formatBytes(25 * 1024 * 1024)).toBe("25 MB");
    expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GB");
  });
});
