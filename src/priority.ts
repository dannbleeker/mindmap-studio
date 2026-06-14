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
