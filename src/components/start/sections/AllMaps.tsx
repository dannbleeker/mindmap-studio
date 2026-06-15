import { useState } from "react";
import { MapCard } from "../MapCard";
import { handleMapAction } from "../mapActions";
import type { StartContext } from "../types";
import { useLibrary } from "../useLibrary";

// The full library — grid ↔ list toggle + sort (recently edited / name A–Z / most nodes). Cards
// carry the hover kebab (Open/Rename/Duplicate/Export/Delete) via handleMapAction.

type Sort = "edited" | "name" | "nodes";

export function AllMaps({ ctx }: { ctx: StartContext }) {
  const entries = useLibrary(ctx.libraryRev);
  const [sort, setSort] = useState<Sort>("edited");
  const [list, setList] = useState(false);
  const sorted = [...entries].sort((a, b) => {
    if (sort === "name") return a.title.localeCompare(b.title);
    if (sort === "nodes") return b.nodeCount - a.nodeCount;
    return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
  });

  return (
    <div className="st-content">
      <div className="st-row">
        <div>
          <h2 className="st-section-title">All maps</h2>
          <p className="st-section-sub">
            {entries.length} map{entries.length === 1 ? "" : "s"} in your library.
          </p>
        </div>
        <div className="st-toolbar">
          <select
            className="st-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort maps"
          >
            <option value="edited">Recently edited</option>
            <option value="name">Name A–Z</option>
            <option value="nodes">Most nodes</option>
          </select>
          <button type="button" className="st-btn" onClick={() => setList((v) => !v)}>
            {list ? "▦ Grid" : "☰ List"}
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="st-empty">No maps yet — create one from the Start screen.</div>
      ) : list ? (
        <div className="st-list">
          {sorted.map((e) => (
            <div key={e.id} className="st-list-row">
              <button
                type="button"
                className="st-link"
                style={{ flex: 1, textAlign: "left", color: "var(--st-ink)", fontWeight: 600 }}
                onClick={() => handleMapAction("open", e, ctx)}
              >
                {e.title || "(untitled)"}
              </button>
              <span className="st-card-meta">{e.nodeCount} nodes</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="st-grid">
          {sorted.map((e) => (
            <MapCard key={e.id} entry={e} onAction={(a, en) => handleMapAction(a, en, ctx)} />
          ))}
        </div>
      )}
    </div>
  );
}
