import type { LibraryHit } from "../search";

// The result list for "Search across every map": one clickable row per hit, showing the topic, its
// map, the ancestor breadcrumb (so a bare topic like "Tasks" is placeable), and — when the match
// landed in the note rather than the topic — a short context snippet. Capped at 50 rows with an
// overflow hint. Presentational + pure (state + the searchLibrary call live in App), so it's
// unit-testable on crafted hits.
export function SearchResults({
  hits,
  onPick,
}: {
  hits: LibraryHit[];
  onPick: (hit: LibraryHit) => void;
}) {
  if (hits.length === 0)
    return (
      <p style={{ color: "var(--ed-muted)", fontSize: 13, margin: "12px 2px 0" }}>No matches.</p>
    );
  const faint = (fontSize: number) => ({
    display: "block" as const,
    color: "var(--ed-faint)",
    fontSize,
    marginTop: 1,
  });
  return (
    <ul
      style={{
        listStyle: "none",
        margin: "10px 0 0",
        padding: 0,
        maxHeight: 320,
        overflow: "auto",
      }}
    >
      {hits.slice(0, 50).map((h) => (
        <li key={`${h.mapId}:${h.nodeId}`}>
          <button
            type="button"
            onClick={() => onPick(h)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              border: "none",
              borderRadius: 6,
              background: "transparent",
              padding: "6px 8px",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <span>{h.topic}</span>{" "}
            <span style={{ color: "var(--ed-faint)", fontSize: 12 }}>— {h.mapTitle}</span>
            {h.path.length > 0 && <span style={faint(11)}>{h.path.join(" › ")}</span>}
            {h.snippet && (
              <span style={{ ...faint(12), color: "var(--ed-muted)" }}>{h.snippet}</span>
            )}
          </button>
        </li>
      ))}
      {hits.length > 50 && (
        <li style={{ color: "var(--ed-faint)", fontSize: 12, padding: "6px 8px" }}>
          +{hits.length - 50} more — refine your search
        </li>
      )}
    </ul>
  );
}
