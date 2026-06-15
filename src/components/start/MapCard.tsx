import { timeAgo } from "../../ui";
import { MiniMap } from "./MiniMap";

// A saved-map card: thumbnail + title + meta (node count · last edited) + a hover kebab with
// Open / Rename / Duplicate / Export / Delete. The parent wires the actions to the store.

export interface MapEntry {
  id: string;
  title: string;
  nodeCount: number;
  updatedAt?: number;
  sheetGroup?: string;
}

const KEBAB: { key: string; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "rename", label: "Rename" },
  { key: "duplicate", label: "Duplicate" },
  { key: "export", label: "Export…" },
  { key: "delete", label: "Delete" },
];

export function MapCard({
  entry,
  onAction,
}: {
  entry: MapEntry;
  onAction: (action: string, entry: MapEntry) => void;
}) {
  const meta = [`${entry.nodeCount} node${entry.nodeCount === 1 ? "" : "s"}`];
  if (entry.updatedAt) meta.push(timeAgo(entry.updatedAt));
  return (
    <div className="st-card st-card-hover st-tile">
      <button
        type="button"
        className="st-thumb st-thumb-btn"
        onClick={() => onAction("open", entry)}
        title={`Open ${entry.title}`}
      >
        <MiniMap seed={entry.id} />
      </button>
      <div className="st-tile-body">
        <div className="st-row">
          <div className="st-card-title">{entry.title || "(untitled)"}</div>
          <details className="st-kebab">
            <summary aria-label="Map actions">⋯</summary>
            <div className="st-kebab-menu">
              {KEBAB.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={(e) => {
                    e.currentTarget.closest("details")?.removeAttribute("open");
                    onAction(k.key, entry);
                  }}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </details>
        </div>
        <div className="st-card-meta">
          {meta.join(" · ")}
          {entry.sheetGroup ? <span className="st-tag st-tag-soft">sheet</span> : null}
        </div>
      </div>
    </div>
  );
}
