import { describe, expect, it } from "vitest";
import {
  type AttachSide,
  type Box,
  attachSideFor,
  axisForLayoutKind,
  bowToClear,
  branchEndpoints,
  computeAxisByParent,
} from "../src/mindmap/flow/floating";
import { computeLayout, estimateSizeOf } from "../src/mindmap/flow/layout";
import { project } from "../src/mindmap/flow/project";
import type { MapNode, MindMapDoc } from "../src/model/types";

// Obstacle-aware branch routing: a tapered branch bows AROUND any node box its straight path would
// otherwise pass behind. Pure geometry shared by the canvas (FlowMindMap stashes the bow on
// data.attachBow) and the SVG exporter (canvas == export).

const box = (cx: number, cy: number, w = 100, h = 30): Box => ({ cx, cy, w, h });

// Deepest penetration (>0 = inside) of the BOWED centerline cubic into `o`, sampled along the curve.
function maxPenetration(
  parent: Box,
  child: Box,
  side: AttachSide,
  o: Box,
  bow: number,
  margin = 2,
): number {
  const { sx, sy, tx, ty } = branchEndpoints(parent, child, side);
  const horizontal = side === "left" || side === "right";
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  const cnx = -dy / len;
  const cny = dx / len;
  const c1x = (horizontal ? sx + dx * 0.5 : sx) + cnx * bow;
  const c1y = (horizontal ? sy : sy + dy * 0.5) + cny * bow;
  const c2x = (horizontal ? tx - dx * 0.5 : tx) + cnx * bow;
  const c2y = (horizontal ? ty : ty - dy * 0.5) + cny * bow;
  let pen = Number.NEGATIVE_INFINITY;
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const u = 1 - t;
    const px = u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * tx;
    const py = u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ty;
    pen = Math.max(
      pen,
      Math.min(o.w / 2 + margin - Math.abs(px - o.cx), o.h / 2 + margin - Math.abs(py - o.cy)),
    );
  }
  return pen;
}

describe("obstacle-aware branch routing", () => {
  it("bowToClear: 0 with a clear path; a non-zero bow that clears a blocking box", () => {
    const parent = box(400, 200, 90, 28);
    const child = box(120, 70, 120, 26); // up-left of the parent → "left" side
    expect(bowToClear(parent, child, "left", [])).toBe(0);

    // A box squarely between parent and child, on the straight branch path.
    const blocker = box(270, 150, 110, 28);
    expect(maxPenetration(parent, child, "left", blocker, 0)).toBeGreaterThan(0); // un-bowed hits it
    const bow = bowToClear(parent, child, "left", [blocker]);
    expect(bow).not.toBe(0);
    expect(maxPenetration(parent, child, "left", blocker, bow)).toBeLessThanOrEqual(0); // bowed clears it
  });

  it("the screenshot tree: every branch clears all non-endpoint boxes after bowing", () => {
    let seq = 0;
    const node = (topic: string, children: MapNode[] = []): MapNode => ({
      id: `${topic.replace(/\W+/g, "_")}_${seq++}`,
      topic,
      children,
    });
    const doc: MindMapDoc = {
      schemaVersion: 1,
      id: "doc",
      title: "Areas of Focus",
      root: node("Areas of Focus", [
        node("ERHVERV", [
          node("BESTSELLER A/S", [
            node("Retail Circle", [
              node("Retail Expansion", [node("RE-a"), node("RE-b")]),
              node("Retail Operations", [node("RO-a"), node("RO-b")]),
              node("Improving capabilities", [node("IC-a"), node("IC-b")]),
              node("Selling tickets"),
              node("Employee satisfaction"),
              node("Budget adherence"),
            ]),
            node("Enablement", [
              node("License Management", [node("LM-a"), node("LM-b")]),
              node("Internal Communication", [node("ICm-a"), node("ICm-b")]),
              node("Financial Management"),
              node("IT Security"),
            ]),
          ]),
          node("Censor på uni", [node("Eksamen"), node("Vejledning")]),
          node("EAAA"),
        ]),
      ]),
    };

    const kind = "left" as const;
    const { nodes, edges } = project(doc, undefined, false, kind);
    const size = estimateSizeOf(nodes);
    const pos = computeLayout(nodes, edges, size, kind);
    const boxOf = (id: string): Box | null => {
      const p = pos.get(id);
      if (!p) return null;
      const s = size(id);
      return { cx: p.x + s.width / 2, cy: p.y + s.height / 2, w: s.width, h: s.height };
    };
    const allBoxes = nodes.map((n) => ({ id: n.id, box: boxOf(n.id) })).filter((b) => b.box);
    const axis = computeAxisByParent(edges, boxOf, axisForLayoutKind(kind));

    const offenders: string[] = [];
    for (const e of edges) {
      if (e.data?.crosslink) continue;
      const pb = boxOf(e.source);
      const cb = boxOf(e.target);
      if (!pb || !cb) continue;
      const side = attachSideFor(pb, cb, axis.get(e.source) ?? "h");
      const obstacles = allBoxes
        .filter((b) => b.id !== e.source && b.id !== e.target)
        .map((b) => b.box as Box);
      const bow = bowToClear(pb, cb, side, obstacles);
      for (const b of allBoxes) {
        if (b.id === e.source || b.id === e.target || !b.box) continue;
        if (maxPenetration(pb, cb, side, b.box, bow) > 0) {
          offenders.push(`${e.source} → ${e.target} still hits ${b.id}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
