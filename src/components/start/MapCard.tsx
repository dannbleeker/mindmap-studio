import { timeAgo } from "../../ui";
import { MiniMap } from "./MiniMap";

// A saved-map card: thumbnail + title + meta (node count · last edited) + a hover kebab with
// Open / Rename / Duplicate / Export / Delete. The parent wires the actions to the store.

export interface MapEntry {
  id: string;
  title: string;
  nodeCount: number;
  updatedAt?: number;
  /** Real branch colours (one per root child) → a structure-bearing thumbnail; absent for a bare root. */
  branches?: string[];
  /** Pinned to the top of the library lists (curated, recency-independent). */
  pinned?: boolean;
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
  // Pin/unpin leads the kebab so a curated map can be kept at (or released from) the top of the lists.
  const kebabItems = [{ key: "pin", label: entry.pinned ? "Unpin" : "Pin to top" }, ...KEBAB];
  return (
    <div className="st-card st-card-hover st-tile">
      <button
        type="button"
        className="st-thumb st-thumb-btn"
        onClick={() => onAction("open", entry)}
        title={`Open ${entry.title}`}
      >
        <MiniMap seed={entry.id} branches={entry.branches} />
      </button>
      <div className="st-tile-body">
        <div className="st-row">
          <div className="st-card-title">
            {entry.pinned ? (
              <span aria-hidden="true" title="Pinned" style={{ marginRight: 5 }}>
                ★
              </span>
            ) : null}
            {entry.title || "(untitled)"}
          </div>
          <details className="st-kebab">
            <summary aria-label="Map actions">⋯</summary>
            <div className="st-kebab-menu">
              {kebabItems.map((k) => (
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
        <div className="st-card-meta">{meta.join(" · ")}</div>
      </div>
    </div>
  );
}
