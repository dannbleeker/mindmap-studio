// Task priority — a small, sortable/filterable level stored on TaskInfo.priority (1 = High .. 3 = Low).
// Distinct from the emoji priority markers in that it's a structured value the Power Filter can match.
// Pure constants shared by the node badge, the Info panel, the exporter, and the filter.

export const PRIORITY_LEVELS = [1, 2, 3] as const;

export const PRIORITY_LABEL: Record<number, string> = { 1: "High", 2: "Med", 3: "Low" };

export const PRIORITY_COLOR: Record<number, string> = {
  1: "#e23b3b",
  2: "#d98a17",
  3: "#3b8bd4",
};

// The picker offers the 1–3 High/Med/Low scheme, but TaskInfo.priority is modelled 1..9 (MindManager's
// range, 1 = highest) so an imported map can carry 4–9. Render those as their number on a neutral badge
// rather than a meaningless "?" / grey #888. Used by the node badge, the exporter, and the filter label.
export function priorityLabel(p: number): string {
  return PRIORITY_LABEL[p] ?? String(p);
}

export function priorityColor(p: number): string {
  return PRIORITY_COLOR[p] ?? "#6b7280";
}
