import { describe, expect, it } from "vitest";
import { wrapSvgHtml } from "../src/io/html";

describe("wrapSvgHtml", () => {
  it("embeds the svg in a self-contained html document", () => {
    const html = wrapSvgHtml("<svg><rect /></svg>", "My Map");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<svg><rect /></svg>");
    expect(html).toContain("<title>My Map</title>");
  });

  it("escapes the title", () => {
    expect(wrapSvgHtml("<svg/>", "A & B <plan>")).toContain(
      "<title>A &amp; B &lt;plan&gt;</title>",
    );
  });
});
