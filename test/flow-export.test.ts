// @vitest-environment jsdom
//
// Phase F go/no-go: the React Flow SVG exporter. buildFlowSvg() authors a standalone,
// native-<text> SVG straight from the canonical model + the live node rects (no
// foreignObject), so it renders everywhere and flows cleanly through the same
// useMapExports.cleanSvg() pipeline (sanitizeSvg) that drives
// png/svg/html/pdf. This pins two things: (1) the SVG carries every visible element —
// topics (incl. multi-line), markers, images, branch + cross-link paths, boundary box —
// AND the labels a foreignObject-based export drops (cross-link + boundary); (2) all of
// that survives the export pipeline unchanged.
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "../src/io/svgSanitize";
import { arrowHeadPath } from "../src/mindmap/flow/CrosslinkEdge";
import { type NodeRect, buildFlowSvg } from "../src/mindmap/flow/exportSvg";
import { shapePath } from "../src/mindmap/flow/shapes";
import { CROSSLINK_COLOR } from "../src/mindmap/flow/style";
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
        callouts: [{ id: "co1", text: "Review me", dx: 48, dy: -20 }],
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

  it("uses a per-map background colour over the theme default", () => {
    const withBg = buildFlowSvg(
      { ...doc, meta: { background: "#abcdef" } },
      rects,
      palette,
      cssVar,
    );
    expect(withBg).toContain('fill="#abcdef"');
    expect(withBg).not.toContain("#faf9f5"); // the theme page bg is overridden
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

  it("draws a directional arrowhead on the cross-link (a filled triangle at the target)", () => {
    // a 3-vertex triangle filled with the cross-link colour — the relationship's arrowhead
    // (branch ribbons fill with branch colours; the dashed line uses stroke, not fill)
    expect(svg).toMatch(
      new RegExp(
        `<path d="M -?[\\d.]+ -?[\\d.]+ L -?[\\d.]+ -?[\\d.]+ L -?[\\d.]+ -?[\\d.]+ Z" fill="${CROSSLINK_COLOR}"`,
      ),
    );
  });

  it("draws the boundary box and carries its label (dropped by the old export)", () => {
    // a rounded boundary rect + its chip text
    expect(svg).toMatch(/<rect[^>]*rx="16"[^>]*stroke="#8b87e0"/);
    expect(svg).toContain("Theme group");
  });

  it("emits a geometric node as the shared shapePath (canvas == export), not a rect", () => {
    const sdoc: MindMapDoc = {
      schemaVersion: 1,
      id: "s",
      title: "Shapes",
      root: {
        id: "r",
        topic: "Root",
        children: [
          {
            id: "dia",
            topic: "Decision",
            style: { shape: "diamond", background: "#fde2e2" },
            children: [],
          },
        ],
      },
    };
    const srects = new Map<string, NodeRect>([
      ["r", { x: 0, y: 0, w: 100, h: 40 }],
      ["dia", { x: 200, y: 0, w: 120, h: 50 }],
    ]);
    const out = buildFlowSvg(sdoc, srects, palette, cssVar);
    // The exact path the canvas paints — same builder — filled with the node's own background.
    expect(out).toContain(`<path d="${shapePath("diamond", 200, 0, 120, 50)}"`);
    expect(out).toContain('fill="#fde2e2"');
  });

  it("draws a summary bracket (path) + its label, side-aware", () => {
    // Isolated doc so the shared-doc path count above stays branch+crosslink only.
    const withSummary = buildFlowSvg(
      { ...doc, summaries: [{ id: "su1", nodeIds: ["b"], label: "Phase 1" }] },
      rects,
      palette,
      cssVar,
    );
    expect(withSummary).toMatch(/<path[^>]*stroke="#27852f"/); // the bracket polyline
    expect(withSummary).toContain("Phase 1");
    // The bracket adds exactly one extra <path> over the no-summary export.
    const base = (svg.match(/<path[\s>]/g) ?? []).length;
    const withCount = (withSummary.match(/<path[\s>]/g) ?? []).length;
    expect(withCount).toBe(base + 1);
  });

  it("renders callouts (sticky bubble + dashed connector + text)", () => {
    expect(svg).toContain("Review me");
    expect(svg).toContain('fill="#fff8c5"'); // sticky-note bubble
    expect(svg).toMatch(/stroke-dasharray="3 3"/); // callout connector (distinct from cross-link)
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

describe("flow exportSvg survives the cleanSvg pipeline (sanitizeSvg)", () => {
  // The export gate: a native-text SVG must pass through cleanSvg unchanged (sanitizeSvg keeps
  // the safe element vocabulary), so png/svg/html/pdf still work.
  const out = sanitizeSvg(buildFlowSvg(doc, rects, palette, cssVar));

  it("keeps every topic + multi-line tspan", () => {
    expect(out).toContain("Root");
    expect(out).toMatch(/<tspan[^>]*>⭐ Multi<\/tspan>/);
    expect(out).toContain("Line");
  });

  it("keeps the cross-link and boundary labels", () => {
    expect(out).toContain("depends on");
    expect(out).toContain("Theme group");
  });

  it("keeps callout text", () => {
    expect(out).toContain("Review me");
  });

  it("keeps the marker icon and the image data URL", () => {
    expect(out).toContain("⭐");
    expect(out).toContain("data:image/png;base64,");
  });

  it("keeps all path geometry (3 branches + 1 crosslink line + 1 crosslink arrowhead)", () => {
    expect((out.match(/<path[\s>]/g) ?? []).length).toBe(5);
  });

  it("introduced no foreignObject and no script", () => {
    expect(out).not.toMatch(/foreignObject/);
    expect(out).not.toMatch(/<script/i);
  });
});

describe("arrowHeadPath (shared relationship arrowhead)", () => {
  it("builds a 3-vertex triangle with its tip at the target, pointing away from the source", () => {
    const d = arrowHeadPath(100, 0, 0, 0, 9); // horizontal, pointing +x
    expect(d.startsWith("M 100 0 L")).toBe(true); // tip exactly at the target
    expect(d.endsWith("Z")).toBe(true);
    expect((d.match(/L/g) ?? []).length).toBe(2); // 3 vertices
    // base sits `size` back from the tip along the axis
    expect(d).toContain("L 91 "); // bx = 100 - 9
  });
});
