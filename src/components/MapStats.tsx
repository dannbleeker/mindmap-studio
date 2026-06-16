import type { MapNode, MindMapDoc } from "../model/types";

// MapStats — the right-panel empty state shown when no node is selected (the inspector takes over on
// selection). A quick read on the whole map: total topics, first-level branches, and task progress
// rolled up from per-node `progress`. Styled via .mm-inspector* / .mm-stat* in editor.css so it
// re-themes with the chrome. Pure derivation from the live doc.

interface Counts {
  total: number;
  withProgress: number;
  done: number;
}

function tally(node: MapNode, acc: Counts): Counts {
  acc.total += 1;
  const progress = node.task?.progress;
  if (typeof progress === "number") {
    acc.withProgress += 1;
    if (progress >= 1) acc.done += 1; // task.progress is 0..1
  }
  for (const c of node.children) tally(c, acc);
  return acc;
}

export function MapStats({ doc }: { doc: MindMapDoc }) {
  const counts = tally(doc.root, { total: 0, withProgress: 0, done: 0 });
  const branches = doc.root.children.length;
  const pct = counts.withProgress > 0 ? Math.round((counts.done / counts.withProgress) * 100) : 0;
  return (
    <aside className="mm-inspector" aria-label="Map overview">
      <div className="mm-inspector-head">
        <div style={{ fontSize: 11.5, color: "var(--ed-muted)", marginBottom: 5 }}>
          No node selected
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {doc.title || "Map"}
        </div>
      </div>
      <div className="mm-inspector-body">
        <div className="mm-stat-grid">
          <div className="mm-stat">
            <div className="mm-stat-num">{counts.total}</div>
            <div className="mm-stat-label">topics</div>
          </div>
          <div className="mm-stat">
            <div className="mm-stat-num">{branches}</div>
            <div className="mm-stat-label">{branches === 1 ? "branch" : "branches"}</div>
          </div>
        </div>
        {counts.withProgress > 0 && (
          <div className="mm-stat" style={{ flex: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Task progress</span>
              <span
                className="mm-mono"
                style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ed-accent)" }}
              >
                {counts.done}/{counts.withProgress}
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: "var(--ed-divider)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: "var(--ed-accent)",
                  borderRadius: 999,
                  transition: "width .3s",
                }}
              />
            </div>
          </div>
        )}
        <div
          style={{
            fontSize: 12,
            color: "var(--ed-faint)",
            textAlign: "center",
            marginTop: 8,
            lineHeight: 1.7,
          }}
        >
          Click any node to inspect it
        </div>
      </div>
    </aside>
  );
}
