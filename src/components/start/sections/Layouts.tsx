import { tNodes } from "../../../i18n/nodes";
import { t } from "../../../i18n/registry";
import "../messages";
import type { BackdropKind, MindMapDoc } from "../../../model/types";
import { blankDoc } from "../docBuilders";
import type { StartContext } from "../types";

// Structural layouts + diagram backdrops. Each opens a BLANK map in that view — and the copy makes
// clear a layout is just a view you can switch any time; your topics don't move.

const LAYOUTS: { kind: string; label: string }[] = [
  { kind: "side", label: t("start.twoSided") },
  { kind: "right", label: t("start.allRight") },
  { kind: "left", label: t("start.allLeft") },
  { kind: "radial", label: t("cmd.layout.radial") },
  { kind: "org-down", label: t("toolbar.orgChart") },
  { kind: "org-up", label: t("toolbar.orgChart2") },
  { kind: "timeline", label: t("cmd.layout.timeline") },
  { kind: "fishbone", label: t("cmd.layout.fishbone") },
  { kind: "grid", label: t("cmd.layout.grid") },
  { kind: "swimlane", label: t("cmd.layout.swimlane") },
  { kind: "brace", label: t("cmd.layout.brace") },
];

const BACKDROPS: { kind: BackdropKind; label: string }[] = [
  { kind: "onion", label: t("start.onion") },
  { kind: "funnel", label: t("start.funnel") },
  { kind: "venn2", label: t("start.venn2") },
  { kind: "venn3", label: t("start.venn3") },
];

function backdropDoc(kind: BackdropKind): MindMapDoc {
  const d = blankDoc();
  return { ...d, meta: { ...d.meta, freeform: true }, backdrop: { kind } };
}

export function Layouts({ ctx }: { ctx: StartContext }) {
  return (
    <div className="st-content">
      <section>
        <h2 className="st-section-title">{t("start.layouts")}</h2>
        <p className="st-section-sub">
          {tNodes("start.layoutExplain", { view: <strong>{t("start.viewWord")}</strong> })}
        </p>
      </section>

      <section>
        <h3 className="st-section-title" style={{ fontSize: 13, color: "var(--st-muted)" }}>
          {t("start.structuralLayouts")}
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
          {t("start.diagramBackdrops")}
        </h3>
        <p className="st-section-sub">{t("start.aGeometricFrameBehindFree")}</p>
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
