// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { inlineSvgText } from "../src/io/svgText";

const XHTML = 'xmlns="http://www.w3.org/1999/xhtml"';
const svg = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">${inner}</svg>`;

describe("inlineSvgText", () => {
  it("replaces a foreignObject label with a positioned, styled native <text>", () => {
    const input = svg(
      `<rect x="10" y="10" width="120" height="24" rx="6" fill="#eee"/><g><foreignObject x="14" y="12" width="110" height="20"><div ${XHTML} style="font-size: 16px; font-weight: 400; color: rgb(44, 44, 42);">Merchandising</div></foreignObject></g>`,
    );
    const out = inlineSvgText(input);
    expect(out).not.toMatch(/foreignObject/);
    expect(out).toMatch(/<text[^>]*>Merchandising<\/text>/);
    expect(out).toMatch(/<text[^>]*x="14"/);
    expect(out).toMatch(/font-size="16"/);
    expect(out).toMatch(/fill="rgb\(44, 44, 42\)"/);
    // node boxes (rects) and structure are preserved
    expect(out).toMatch(/<rect/);
  });

  it("keeps bold weight for branch labels", () => {
    const input = svg(
      `<g><foreignObject x="0" y="0" width="50" height="20"><div ${XHTML} style="font-size:16px;font-weight:700;color:#111;">Branch</div></foreignObject></g>`,
    );
    expect(inlineSvgText(input)).toMatch(/<text[^>]*font-weight="700"/);
  });

  it("does not set font-weight for the default (400) weight", () => {
    const input = svg(
      `<g><foreignObject x="0" y="0" width="50" height="20"><div ${XHTML} style="font-size:16px;font-weight:400;color:#111;">Leaf</div></foreignObject></g>`,
    );
    expect(inlineSvgText(input)).not.toMatch(/font-weight/);
  });

  it("escapes text content (no raw markup leaks into the SVG)", () => {
    const input = svg(
      `<g><foreignObject x="0" y="0" width="80" height="20"><div ${XHTML} style="font-size:16px;">A &amp; B</div></foreignObject></g>`,
    );
    const out = inlineSvgText(input);
    expect(out).toContain("A &amp; B");
    expect(out).not.toMatch(/foreignObject/);
  });

  it("leaves an SVG with no foreignObjects unchanged in structure", () => {
    const out = inlineSvgText(svg(`<rect x="0" y="0" width="10" height="10"/>`));
    expect(out).toMatch(/<rect/);
    expect(out).not.toMatch(/foreignObject|<text/);
  });
});
