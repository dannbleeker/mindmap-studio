import { ViewportPortal, useNodes } from "@xyflow/react";
import { type BraceGroup, braceGeometry } from "./brace";
import type { Rect } from "./geometry";
import { BRACE_STROKE } from "./style";

// Brace-map connectors: a "{" fork per parent, drawn in flow space via ViewportPortal so it
// pans/zooms with the map. Lines are plain bordered divs (like the summary bracket), positioned
// from the shared braceGeometry — so the SVG export matches exactly.

const line = (style: React.CSSProperties): React.CSSProperties => ({
  position: "absolute",
  pointerEvents: "none",
  ...style,
});

export function BraceConnectors({ braces }: { braces: BraceGroup[] }) {
  const nodes = useNodes();
  if (braces.length === 0) return null;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rectOf = (id: string): Rect | null => {
    const n = byId.get(id);
    if (!n) return null;
    return {
      x: n.position.x,
      y: n.position.y,
      w: n.measured?.width ?? 0,
      h: n.measured?.height ?? 0,
    };
  };

  return (
    <ViewportPortal>
      {braces.map(({ parentId, childIds }) => {
        const parent = rectOf(parentId);
        if (!parent) return null;
        const kids = childIds.map(rectOf).filter((r): r is Rect => r !== null);
        if (kids.length === 0) return null;
        const g = braceGeometry(parent, kids);
        const border = `2px solid ${BRACE_STROKE}`;
        return (
          <div key={parentId} style={line({ left: 0, top: 0 })}>
            {/* parent tee (horizontal) */}
            <div
              style={line({
                left: g.spineX,
                top: g.parentTeeY,
                width: g.parentRightX - g.spineX,
                borderTop: border,
              })}
            />
            {/* spine (vertical) */}
            <div
              style={line({
                left: g.spineX,
                top: g.spineTop,
                height: g.spineBottom - g.spineTop,
                borderLeft: border,
              })}
            />
            {/* child stubs (horizontal) */}
            {g.stubs.map((s) => (
              <div
                key={`${parentId}:${s.toX},${s.y}`}
                style={line({ left: s.fromX, top: s.y, width: s.toX - s.fromX, borderTop: border })}
              />
            ))}
          </div>
        );
      })}
    </ViewportPortal>
  );
}
