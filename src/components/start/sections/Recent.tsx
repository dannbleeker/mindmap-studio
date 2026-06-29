import { MapCard, type MapEntry } from "../MapCard";
import { handleMapAction } from "../mapActions";
import type { StartContext } from "../types";
import { useLibrary } from "../useLibrary";
import { EmptyMaps } from "./EmptyMaps";

// Saved maps grouped by last-edited. Finer buckets than Today/Yesterday/Earlier so a returning user
// with weeks of history gets temporal landmarks instead of one undifferentiated "Earlier" wall.
// ("Not yet saved" covers any map without a timestamp.)

const GROUPS = [
  "Today",
  "Yesterday",
  "Earlier this week",
  "This month",
  "Older",
  "Not yet saved",
] as const;
type Group = (typeof GROUPS)[number];

const DAY = 86_400_000;

function groupOf(ts: number | undefined): Group {
  if (!ts) return "Not yet saved";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= startToday) return "Today";
  if (ts >= startToday - DAY) return "Yesterday";
  if (ts >= startToday - 7 * DAY) return "Earlier this week";
  if (ts >= new Date(now.getFullYear(), now.getMonth(), 1).getTime()) return "This month";
  return "Older";
}

export function Recent({ ctx }: { ctx: StartContext }) {
  const entries = [...useLibrary(ctx.libraryRev)].sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
  );
  const byGroup = new Map<Group, MapEntry[]>();
  for (const e of entries) {
    const g = groupOf(e.updatedAt);
    const arr = byGroup.get(g);
    if (arr) arr.push(e);
    else byGroup.set(g, [e]);
  }

  return (
    <div className="st-content">
      <section>
        <h2 className="st-section-title">Recent</h2>
        <p className="st-section-sub">Your maps, newest first.</p>
      </section>
      {entries.length === 0 ? (
        <EmptyMaps ctx={ctx} />
      ) : (
        GROUPS.filter((g) => byGroup.has(g)).map((g) => (
          <section key={g}>
            <h3 className="st-section-title" style={{ fontSize: 13, color: "var(--st-muted)" }}>
              {g}
            </h3>
            <div className="st-grid" style={{ marginTop: 10 }}>
              {(byGroup.get(g) ?? []).map((e) => (
                <MapCard key={e.id} entry={e} onAction={(a, en) => handleMapAction(a, en, ctx)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
