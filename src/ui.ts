// Shared inline styles for the toolbar controls, used by App and the panels.

export const controlStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#26215c",
  border: "1px solid #cecbf6",
  background: "#eeedfe",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
} as const;

export const inputStyle = {
  fontSize: 13,
  color: "#26215c",
  border: "1px solid #cecbf6",
  background: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  width: 130,
} as const;

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
