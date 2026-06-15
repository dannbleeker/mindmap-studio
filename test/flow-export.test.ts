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
import { STICKERS, stickerImage } from "../src/stickers";

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
      { id: "c", topic: "Plain", side: "left", style: { fontFamily: "serif" }, children: [] },
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

  it("emits a background <image> over the viewBox when meta.backgroundImage is set", () => {
    const BG =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
    const withImg = buildFlowSvg({ ...doc, meta: { backgroundImage: BG } }, rects, palette, cssVar);
    // The exact viewBox the page-bg rect uses, so the image covers the whole map (slice = cover).
    const vb = withImg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
    expect(vb).not.toBeNull();
    const [, vx, vy, vw, vh] = vb as RegExpMatchArray;
    expect(withImg).toContain(
      `<image x="${vx}" y="${vy}" width="${vw}" height="${vh}" href="${BG}" preserveAspectRatio="xMidYMid slice"/>`,
    );
    // It sits on top of the page-background rect, beneath the rest (the first node/path).
    const rectEnd = withImg.indexOf("/>") + 2; // end of the page-bg rect
    expect(withImg.indexOf(BG)).toBeGreaterThan(rectEnd);
  });

  it("omits the background <image> when meta.backgroundImage is unset", () => {
    // No "slice" image anywhere; node images use "meet", so the bg layer is what's gated here.
    expect(svg).not.toContain('preserveAspectRatio="xMidYMid slice"');
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

  it("applies a per-topic font family (and defaults to sans-serif)", () => {
    expect(svg).toContain('font-family="serif"'); // node "c" is styled serif
    expect(svg).toContain('font-family="sans-serif"'); // unstyled topics keep the default
  });

  it("embeds an image node with its data URL", () => {
    expect(svg).toMatch(/<image[\s>]/);
    expect(svg).toContain("data:image/png;base64,");
  });

  it("embeds a built-in sticker (SVG data URL) as a node <image> with a positive size", () => {
    // A sticker is just node.image with a data:image/svg+xml URL, so it must flow through the very
    // same <image> path as a file image — proving stickers render in every export with no new code.
    const sticker = stickerImage(STICKERS[0]);
    const withSticker = buildFlowSvg(
      {
        ...doc,
        root: {
          ...doc.root,
          children: [{ id: "s", topic: "Star it", image: sticker, children: [] }],
        },
      },
      new Map<string, NodeRect>([
        ["r", { x: 400, y: 300, w: 120, h: 50 }],
        ["s", { x: 600, y: 380, w: 120, h: 120 }],
      ]),
      palette,
      cssVar,
    );
    const m = withSticker.match(
      /<image x="[-\d.]+" y="[-\d.]+" width="([\d.]+)" height="([\d.]+)" href="(data:image\/svg\+xml,[^"]+)"/,
    );
    expect(m).not.toBeNull();
    const [, w, , href] = m as RegExpMatchArray;
    expect(Number(w)).toBeGreaterThan(0); // sized node → positive image box (shared image math)
    // …and the href round-trips back to the sticker's own SVG.
    expect(decodeURIComponent(href.slice("data:image/svg+xml,".length))).toBe(STICKERS[0].svg);
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

  it("line-jumps: draws a hop arc on exactly one crossing relationship (canvas == export)", () => {
    // Four nodes at the corners of a square; two diagonal relationships cross in the middle.
    const ldoc: MindMapDoc = {
      schemaVersion: 1,
      id: "lj",
      title: "LJ",
      meta: { lineJumps: true },
      root: {
        id: "r",
        topic: "R",
        children: [
          { id: "tl", topic: "TL", children: [] },
          { id: "tr", topic: "TR", children: [] },
          { id: "bl", topic: "BL", children: [] },
          { id: "br", topic: "BR", children: [] },
        ],
      },
      links: [
        { id: "d1", from: "tl", to: "br" }, // ↘
        { id: "d2", from: "tr", to: "bl" }, // ↙ — crosses d1
      ],
    };
    const lrects = new Map<string, NodeRect>([
      ["r", { x: 240, y: 240, w: 40, h: 20 }],
      ["tl", { x: 0, y: 0, w: 80, h: 40 }],
      ["tr", { x: 440, y: 0, w: 80, h: 40 }],
      ["bl", { x: 0, y: 440, w: 80, h: 40 }],
      ["br", { x: 440, y: 440, w: 80, h: 40 }],
    ]);
    const out = buildFlowSvg(ldoc, lrects, palette, cssVar);
    // Exactly one relationship hops (one elliptical-arc command on a dashed line).
    const hopLines =
      out.match(
        /<path d="[^"]*A [^"]*" fill="none" stroke="[^"]*" stroke-width="[^"]*" stroke-dasharray=/g,
      ) ?? [];
    expect(hopLines).toHaveLength(1);
    // …and turning the flag off removes the hop (plain S-bezier relationships).
    const off = buildFlowSvg({ ...ldoc, meta: {} }, lrects, palette, cssVar);
    expect(off).not.toMatch(/<path d="[^"]*A [^"]*" fill="none"[^>]*stroke-dasharray=/);
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

  it("exports the extended vector shapes (cloud / star / document …) via the same path builder", () => {
    const shapes = ["trapezoid", "octagon", "document", "callout", "star", "cloud"] as const;
    const sdoc: MindMapDoc = {
      schemaVersion: 1,
      id: "x",
      title: "Extended",
      root: {
        id: "r",
        topic: "Root",
        children: shapes.map((shape, i) => ({
          id: shape,
          topic: shape,
          style: { shape },
          // alternate sides so the layout rects below stay simple
          side: i % 2 === 0 ? ("right" as const) : ("left" as const),
          children: [],
        })),
      },
    };
    const xrects = new Map<string, NodeRect>([["r", { x: 0, y: 0, w: 100, h: 40 }]]);
    shapes.forEach((shape, i) => xrects.set(shape, { x: 200, y: i * 70, w: 130, h: 56 }));
    const out = buildFlowSvg(sdoc, xrects, palette, cssVar);
    // Each shape lands in the export as the exact path the canvas paints (same builder).
    for (const shape of shapes) {
      const r = xrects.get(shape) as NodeRect;
      expect(out, shape).toContain(`<path d="${shapePath(shape, r.x, r.y, r.w, r.h)}"`);
    }
  });

  it("draws the diagram backdrop (concentric circles) and extends the viewBox to include it", () => {
    const odoc: MindMapDoc = {
      schemaVersion: 1,
      id: "o",
      title: "O",
      backdrop: { kind: "onion", rings: 2 },
      root: { id: "r", topic: "R", children: [] },
    };
    const orects = new Map<string, NodeRect>([["r", { x: -20, y: -20, w: 40, h: 40 }]]);
    const out = buildFlowSvg(odoc, orects, palette, cssVar);
    expect((out.match(/<circle /g) ?? []).length).toBe(2); // 2 onion rings
    expect(out).toContain('stroke="#9a93d6"'); // BACKDROP_STROKE
    const vbW = Number(out.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) [\d.]+"/)?.[1] ?? 0);
    expect(vbW).toBeGreaterThanOrEqual(600); // bounds extended to the 600-wide onion
  });

  it("brace mode emits fork connectors (stroked path) and drops the tapered ribbons", () => {
    const bdoc: MindMapDoc = {
      schemaVersion: 1,
      id: "br",
      title: "B",
      root: {
        id: "r",
        topic: "R",
        children: [
          { id: "a", topic: "A", children: [] },
          { id: "c", topic: "C", children: [] },
        ],
      },
    };
    const brects = new Map<string, NodeRect>([
      ["r", { x: 0, y: 50, w: 100, h: 40 }],
      ["a", { x: 200, y: 0, w: 80, h: 40 }],
      ["c", { x: 200, y: 100, w: 80, h: 40 }],
    ]);
    const braces = [{ parentId: "r", childIds: ["a", "c"] }];
    const filled = (s: string) =>
      (s.match(/<path d="[^"]*" fill="#[0-9a-f]{3,8}"\/>/gi) ?? []).length;
    const withRibbons = buildFlowSvg(bdoc, brects, palette, cssVar);
    const withBraces = buildFlowSvg(bdoc, brects, palette, cssVar, false, "", braces);
    expect(withBraces).toContain('stroke="#6b7280"'); // the fork
    expect(filled(withBraces)).toBeLessThan(filled(withRibbons)); // ribbons gone in brace mode
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
