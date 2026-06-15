import type { BackdropKind, MindMapDoc } from "../../../model/types";
import { blankDoc } from "../docBuilders";
import type { StartContext } from "../types";

// Structural layouts + diagram backdrops. Each opens a BLANK map in that view — and the copy makes
// clear a layout is just a view you can switch any time; your topics don't move.

const LAYOUTS: { kind: string; label: string }[] = [
  { kind: "side", label: "Two-sided" },
  { kind: "right", label: "All right" },
  { kind: "left", label: "All left" },
  { kind: "radial", label: "Radial / hub" },
  { kind: "org-down", label: "Org chart ↓" },
  { kind: "org-up", label: "Org chart ↑" },
  { kind: "timeline", label: "Timeline" },
  { kind: "fishbone", label: "Fishbone" },
  { kind: "grid", label: "Grid / matrix" },
  { kind: "brace", label: "Brace map" },
];

const BACKDROPS: { kind: BackdropKind; label: string }[] = [
  { kind: "onion", label: "Onion" },
  { kind: "funnel", label: "Funnel" },
  { kind: "venn2", label: "Venn (2)" },
  { kind: "venn3", label: "Venn (3)" },
];

function backdropDoc(kind: BackdropKind): MindMapDoc {
  const d = blankDoc();
  return { ...d, meta: { ...d.meta, freeform: true }, backdrop: { kind } };
}

export function Layouts({ ctx }: { ctx: StartContext }) {
  return (
    <div className="st-content">
      <section>
        <h2 className="st-section-title">Layouts</h2>
        <p className="st-section-sub">
          A layout is a <strong>view</strong> you can switch any time from the toolbar — your topics
          don't move. Open a blank map in one to start.
        </p>
      </section>

      <section>
        <h3 className="st-section-title" style={{ fontSize: 13, color: "var(--st-muted)" }}>
          Structural layouts
        </h3>
        <div className="st-grid" style={{ marginTop: 10 }}>
          {LAYOUTS.map((l) => (
            <button
              key={l.kind}
              type="button"
              className="st-card st-card-hover st-tile"
              style={{ padding: 16, alignItems: "center", gap: 8 }}
              onClick={() => ctx.onOpen(blankDoc(), l.kind)}
            >
              <span aria-hidden="true" style={{ fontSize: 22, color: "var(--st-accent)" }}>
                ❖
              </span>
              <span className="st-card-title">{l.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="st-section-title" style={{ fontSize: 13, color: "var(--st-muted)" }}>
          Diagram backdrops
        </h3>
        <p className="st-section-sub">A geometric frame behind free-positioned topics.</p>
        <div className="st-grid" style={{ marginTop: 10 }}>
          {BACKDROPS.map((b) => (
            <button
              key={b.kind}
              type="button"
              className="st-card st-card-hover st-tile"
              style={{ padding: 16, alignItems: "center", gap: 8 }}
              onClick={() => ctx.onOpen(backdropDoc(b.kind))}
            >
              <span aria-hidden="true" style={{ fontSize: 22, color: "var(--st-accent)" }}>
                ◎
              </span>
              <span className="st-card-title">{b.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
