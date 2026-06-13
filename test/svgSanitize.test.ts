// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "../src/io/svgSanitize";

const XHTML = 'xmlns="http://www.w3.org/1999/xhtml"';

describe("sanitizeSvg", () => {
  it("neutralises a foreignObject-based payload (the DOMPurify-killer case)", () => {
    const hostile = `<svg xmlns="http://www.w3.org/2000/svg"><g><foreignObject><div ${XHTML}>topic<img src="x" onerror="alert(1)"/><a href="javascript:alert(2)">x</a><script>alert(3)</script></div></foreignObject></g></svg>`;
    const out = sanitizeSvg(hostile);
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toMatch(/<script/i);
  });

  it("preserves the topic text, the xhtml div, and safe links/images", () => {
    const safe = `<svg xmlns="http://www.w3.org/2000/svg"><g><foreignObject><div ${XHTML}>Hello world<a href="https://example.com">link</a><img src="data:image/png;base64,AAAA"/></div></foreignObject></g></svg>`;
    const out = sanitizeSvg(safe);
    expect(out).toContain("Hello world");
    expect(out).toMatch(/foreignObject/i);
    expect(out).toContain("https://example.com");
    expect(out).toContain("data:image/png;base64,AAAA");
  });

  it("drops a dangerous href but keeps the element and its content", () => {
    const out = sanitizeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><a href="vbscript:msgbox(1)"><text>label</text></a></svg>`,
    );
    expect(out).not.toMatch(/vbscript:/i);
    expect(out).toMatch(/<text/i);
    expect(out).toContain("label");
  });

  it("strips inline event handlers but keeps benign attributes", () => {
    const out = sanitizeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><rect onclick="alert(1)" onload="alert(2)" width="10" height="10"/></svg>`,
    );
    expect(out).not.toMatch(/onclick/i);
    expect(out).not.toMatch(/onload/i);
    expect(out).toMatch(/width="10"/);
  });

  it("removes <script> even when the SVG embeds it directly", () => {
    const out = sanitizeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle r="5"/></svg>`,
    );
    expect(out).not.toMatch(/<script/i);
    expect(out).toMatch(/<circle/i);
  });

  it("fails safe on malformed input (regex fallback, never the raw string)", () => {
    // Unclosed tags → XML parse error → conservative string strip.
    const out = sanitizeSvg(`<svg><script>alert(1)</script><rect onmouseover="x()"`);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/onmouseover/i);
  });

  it("in the regex fallback, drops a dangerous href but keeps a safe one", () => {
    // Unclosed <rect forces the fallback; the href scrub must run both ways.
    const out = sanitizeSvg(
      `<svg><a href="javascript:alert(1)">x</a><a href="https://example.com">y</a><rect`,
    );
    expect(out).not.toMatch(/javascript:/i);
    expect(out).toContain("https://example.com");
  });
});
