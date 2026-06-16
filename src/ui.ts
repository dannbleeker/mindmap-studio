// Shared inline styles for the toolbar controls, used by App and the panels.
//
// The control/input style objects now live with the UI primitives (src/design/primitives.tsx),
// built from the design tokens — re-exported here so the App toolbar's existing `from "./ui"`
// imports keep working unchanged. Same computed style; the values just have names now.
export { controlStyle, inputStyle } from "./design/primitives";

/** Human-friendly relative time ("just now", "5 min ago", "2 h ago", "3 d ago", else a date).
 *  `now` is injectable for deterministic tests. Used by the version-history list. */
export function timeAgo(ts: number, now: number = Date.now()): string {
  const sec = Math.max(0, Math.round((now - ts) / 1000));
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} d ago`;
  return new Date(ts).toLocaleDateString();
}
