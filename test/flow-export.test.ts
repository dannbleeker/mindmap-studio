// @vitest-environment jsdom
//
// Phase F go/no-go: the React Flow SVG exporter. buildFlowSvg() authors a standalone,
// native-<text> SVG straight from the canonical model + the live node rects (no
// foreignObject), so it renders everywhere and flows cleanly through the same
// useMapExports.cleanSvg() pipeline (sanitizeSvg → inlineSvgText) that drives
// png/svg/html/pdf. This pins two things: (1) the SVG carries every visible element —
// topics (incl. multi-line), markers, images, branch + cross-link paths, boundary box —
// AND the labels the old mind-elixir export dropped (cross-link + boundary); (2) all of
// that survives the export pipeline unchanged.
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "../src/io/svgSanitize";
import { inlineSvgText } from "../src/io/svgText";
import { type NodeRect, buildFlowSvg } from "../src/mindmap/flow/exportSvg";
import type { MindMapDoc } from "../src/model/types";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

const doc: MindMapDoc = {
  schemaVersion: 1,
  id: "d",
  title: "Root",
  root: {
    id: "r",
    topic: "Root",
    children: [
      // Multi-line topic + a marker icon + a custom border colour.
      {
        id: "a",
        topic: "Multi\nLine",
        icons: ["⭐"],
        style: { border: "2px solid #e23" },
        children: [],
      },
      // An image node.
      { id: "b", topic: "Picture", image: { url: PNG, width: 64, height: 64 }, children: [] },
      { id: "c", topic: "Plain", side: "left", children: [] },
    ],
  },
  links: [{ id: "l1", from: "a", to: "c", label: "depends on" }],
  boundaries: [{ id: "bd1", nodeIds: ["b", "c"], label: "Theme group" }],
};

const rects = new Map<string, NodeRect>([
  ["r", { x: 400, y: 300, w: 120, h: 50 }],
  ["a", { x: 620, y: 200, w: 140, h: 60 }],
  ["b", { x: 620, y: 380, w: 160, h: 150 }],
  ["c", { x: 180, y: 380, w: 110, h: 50 }],
]);

const palette = ["#E8593C", "#3B8BD4", "#27500A"];
const cssVar: Record<string, string> = {
  "--bgcolor": "#ffffff",
  "--color": "#2c2c2a",
  "--root-bgcolor": "#26215c",
  "--root-color": "#ffffff",
  "--main-bgcolor": "#faf9f5",
};

describe("flow exportSvg (model + rects → native-text SVG)", () => {
  const svg = buildFlowSvg(doc, rects, palette, cssVar);

  it("emits a sized viewBox and a page background", () => {
    expect(svg).toMatch(/<svg[^>]*viewBox="[-\d. ]+"/);
    expect(svg).toContain("#faf9f5");
  });

  it("renders every topic as native <text> (no foreignObject)", () => {
    expect(svg).not.toMatch(/foreignObject/);
    expect(svg).toMatch(/<text[^>]*>Root<\/text>/);
  });

  it("renders a multi-line topic as stacked <tspan> lines with the icon on line 1", () => {
    expect(svg).toMatch(/<tspan[^>]*>⭐ Multi<\/tspan>/);
    expect(svg).toMatch(/<tspan[^>]*dy="[0-9.]+"[^>]*>Line<\/tspan>/);
  });

  it("draws a node border from the style shorthand colour", () => {
    expect(svg).toContain('stroke="#e23"');
  });

  it("embeds an image node with its data URL", () => {
    expect(svg).toMatch(/<image[\s>]/);
    expect(svg).toContain("data:image/png;base64,");
  });

  it("draws branch ribbons (filled <path>) and a dashed cross-link", () => {
    expect(svg).toMatch(/<path d="[^"]+" fill="#/); // tapered branch ribbon
    expect(svg).toMatch(/stroke-dasharray=/); // cross-link
  });

  it("carries the cross-link label (dropped by the old export)", () => {
    expect(svg).toContain("depends on");
  });

  it("draws the boundary box and carries its label (dropped by the old export)", () => {
    // a rounded boundary rect + its chip text
    expect(svg).toMatch(/<rect[^>]*rx="16"[^>]*stroke="#8b87e0"/);
    expect(svg).toContain("Theme group");
  });

  it("escapes XML special characters in topics", () => {
    const tricky = buildFlowSvg(
      { ...doc, root: { id: "r", topic: "A & B <c>", children: [] } },
      new Map([["r", { x: 0, y: 0, w: 100, h: 40 }]]),
      palette,
      cssVar,
    );
    expect(tricky).toContain("A &amp; B &lt;c&gt;");
    expect(tricky).not.toContain("<c>");
  });
});

describe("flow exportSvg survives the cleanSvg pipeline (sanitize → inline)", () => {
  // The real Phase F gate: a native-text SVG must pass through unchanged (inlineSvgText is a
  // no-op for it; sanitizeSvg keeps the safe vocabulary), so png/svg/html/pdf still work.
  const out = inlineSvgText(sanitizeSvg(buildFlowSvg(doc, rects, palette, cssVar)));

  it("keeps every topic + multi-line tspan", () => {
    expect(out).toContain("Root");
    expect(out).toMatch(/<tspan[^>]*>⭐ Multi<\/tspan>/);
    expect(out).toContain("Line");
  });

  it("keeps the cross-link and boundary labels", () => {
    expect(out).toContain("depends on");
    expect(out).toContain("Theme group");
  });

  it("keeps the marker icon and the image data URL", () => {
    expect(out).toContain("⭐");
    expect(out).toContain("data:image/png;base64,");
  });

  it("keeps all branch + cross-link path geometry (4 nodes → 3 branches + 1 crosslink)", () => {
    expect((out.match(/<path[\s>]/g) ?? []).length).toBe(4);
  });

  it("introduced no foreignObject and no script", () => {
    expect(out).not.toMatch(/foreignObject/);
    expect(out).not.toMatch(/<script/i);
  });
});
