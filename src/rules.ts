import type { ConditionalRule, MapNode, NodeStyle } from "./model/types";
import { isOverdue, todayISO } from "./taskDate";

// Conditional formatting: given a node + the map's rules, compute the style that should be layered
// onto it (view-only — never written to the node). A rule matches by tag, marker, "completed" (task
// at 100%), "overdue" (past due + unfinished), "priority" (at/above a threshold), "textContains", or
// "hasAttachment"; later matching rules win on a per-property basis. Pure + unit-tested; the
// projection merges this *under* the node's own explicit style, so manual styling still wins.

/** Does a node match a single rule? `progress` is the node's effective (rolled-up) completion 0..1;
 *  `today` (ISO) anchors the "overdue" check — defaulted so callers needn't thread it, overridable
 *  for deterministic tests. Pure. */
export function matchesRule(
  node: MapNode,
  rule: ConditionalRule,
  progress?: number,
  today: string = todayISO(),
): boolean {
  switch (rule.kind) {
    case "tag":
      return !!rule.value && (node.tags?.includes(rule.value) ?? false);
    case "marker":
      return !!rule.value && (node.icons?.includes(rule.value) ?? false);
    case "completed":
      return (progress ?? 0) >= 1;
    case "overdue":
      return isOverdue(node.task?.due, progress, today);
    case "priority": {
      const threshold = Number(rule.value);
      const p = node.task?.priority;
      return p !== undefined && Number.isFinite(threshold) && p <= threshold;
    }
    case "textContains":
      return !!rule.value && node.topic.toLowerCase().includes(rule.value.toLowerCase());
    case "hasAttachment":
      return (node.attachments?.length ?? 0) > 0;
    default:
      return false;
  }
}

/** Merge the styles of every rule a node matches (later rules win per-property), or undefined. */
export function conditionalStyle(
  node: MapNode,
  rules: ConditionalRule[],
  progress?: number,
  today: string = todayISO(),
): NodeStyle | undefined {
  let merged: NodeStyle | undefined;
  for (const rule of rules) {
    if (matchesRule(node, rule, progress, today)) merged = { ...merged, ...rule.style };
  }
  return merged;
}

/** A short human label for a rule's condition (for the rules list). */
export function describeRule(rule: ConditionalRule): string {
  switch (rule.kind) {
    case "completed":
      return "completed (100%)";
    case "overdue":
      return "overdue";
    case "hasAttachment":
      return "has attachment";
    case "priority":
      return `priority ≤ ${rule.value ?? "?"} (1=High)`;
    case "textContains":
      return `text contains "${rule.value ?? ""}"`;
    default:
      return `${rule.kind} ${rule.value ?? ""}`.trim();
  }
}
