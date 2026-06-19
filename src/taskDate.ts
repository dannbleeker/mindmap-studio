// Pure helpers for topic start/due dates (stored as ISO "YYYY-MM-DD" on TaskInfo). ISO date
// strings sort and compare lexicographically = chronologically, so the comparisons here are plain
// string compares. `todayISO()` is the one impure helper (reads the clock) — everything else takes
// `today` as an argument so it stays deterministic + unit-tested. Drives the node date chip, the
// overdue highlight, and the Power Filter's due criterion.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Compact "Mon D" label for an ISO date (returns the input unchanged if it isn't an ISO date). */
export function formatDateShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1] ?? "?"} ${Number(m[3])}`;
}

/** The inline task-info row (MindManager schedule/assignment line): "▶ start · Nd · @resources",
 *  with only the present fields shown. Single source so the live node (TopicNode) and the SVG
 *  exporter emit byte-identical text — canvas == export. Pure. */
export function taskInfoLine(task: {
  start?: string;
  durationDays?: number;
  resources?: string[];
}): string {
  return [
    task.start ? `▶ ${formatDateShort(task.start)}` : null,
    task.durationDays ? `${task.durationDays}d` : null,
    task.resources?.length ? `@${task.resources.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
}

/** Today's local date as "YYYY-MM-DD". The only clock-reading helper (kept out of the tested set). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO date `n` days after `iso` (local calendar arithmetic; handles month/year rollover). Pure. */
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Past its due date and not finished. Pure (pass `today`). */
export function isOverdue(
  due: string | undefined,
  progress: number | undefined,
  today: string,
): boolean {
  return !!due && (progress ?? 0) < 1 && due < today;
}

/** Due within the next `days` (today..+days inclusive) and not finished — upcoming, not yet overdue. */
export function isDueSoon(
  due: string | undefined,
  progress: number | undefined,
  today: string,
  days = 7,
): boolean {
  if (!due || (progress ?? 0) >= 1) return false;
  return due >= today && due <= addDaysISO(today, days);
}
