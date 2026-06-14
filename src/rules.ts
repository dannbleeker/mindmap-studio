import type { ConditionalRule, MapNode, NodeStyle } from "./model/types";

// Conditional formatting: given a node + the map's rules, compute the style that should be layered
// onto it (view-only — never written to the node). A rule matches by tag, marker, or "completed"
// (task at 100%); later matching rules win on a per-property basis. Pure + unit-tested; the
// projection merges this *under* the node's own explicit style, so manual styling still wins.

/** Does a node match a single rule? `progress` is the node's effective (rolled-up) completion 0..1. */
export function matchesRule(node: MapNode, rule: ConditionalRule, progress?: number): boolean {
  switch (rule.kind) {
    case "tag":
      return !!rule.value && (node.tags?.includes(rule.value) ?? false);
    case "marker":
      return !!rule.value && (node.icons?.includes(rule.value) ?? false);
    case "completed":
      return (progress ?? 0) >= 1;
    default:
      return false;
  }
}

/** Merge the styles of every rule a node matches (later rules win per-property), or undefined. */
export function conditionalStyle(
  node: MapNode,
  rules: ConditionalRule[],
  progress?: number,
): NodeStyle | undefined {
  let merged: NodeStyle | undefined;
  for (const rule of rules) {
    if (matchesRule(node, rule, progress)) merged = { ...merged, ...rule.style };
  }
  return merged;
}

/** A short human label for a rule's condition (for the rules list). */
export function describeRule(rule: ConditionalRule): string {
  if (rule.kind === "completed") return "completed (100%)";
  return `${rule.kind} ${rule.value ?? ""}`.trim();
}
