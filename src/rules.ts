import type { ConditionalRule, CrossLink, MapNode, NodeStyle } from "./model/types";
import { isOverdue, todayISO } from "./taskDate";

/** Build `nodeId → set of relationship types it is an endpoint of` (source OR target), resolving an
 *  absent `CrossLink.type` to "relates-to". Feeds the "relationshipType" conditional rule. Pure. */
export function relationshipTypeIndex(links: CrossLink[] = []): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  const add = (id: string, type: string) => {
    const set = index.get(id) ?? new Set<string>();
    set.add(type);
    index.set(id, set);
  };
  for (const l of links) {
    const type = l.type ?? "relates-to";
    add(l.from, type);
    add(l.to, type);
  }
  return index;
}

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
  /** The set of relationship types this node is an endpoint of (from relationshipTypeIndex); required
   *  for a "relationshipType" rule to match, absent → that rule never matches. */
  relTypes?: Set<string>,
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
    case "relationshipType":
      // A blank value matches any relationship endpoint; a set value matches that specific type.
      return !!relTypes && (rule.value ? relTypes.has(rule.value) : relTypes.size > 0);
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
  relTypes?: Set<string>,
): NodeStyle | undefined {
  let merged: NodeStyle | undefined;
  for (const rule of rules) {
    if (matchesRule(node, rule, progress, today, relTypes)) merged = { ...merged, ...rule.style };
  }
  return merged;
}

/** The non-style *actions* a node's matching rules apply (view-only, like `conditionalStyle`): markers
 *  are **unioned** across every match (deduped, first-seen order), and `branchColor` is **last-match
 *  wins**. Returns empty `icons` + undefined `branchColor` when nothing applies. Pure + unit-tested. */
export function conditionalActions(
  node: MapNode,
  rules: ConditionalRule[],
  progress?: number,
  today: string = todayISO(),
  relTypes?: Set<string>,
): { icons: string[]; branchColor?: string } {
  const icons: string[] = [];
  let branchColor: string | undefined;
  for (const rule of rules) {
    if (!matchesRule(node, rule, progress, today, relTypes)) continue;
    for (const ic of rule.icons ?? []) if (!icons.includes(ic)) icons.push(ic);
    if (rule.branchColor) branchColor = rule.branchColor;
  }
  return { icons, branchColor };
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
    case "relationshipType":
      return rule.value ? `relationship: ${rule.value}` : "has a relationship";
    default:
      return `${rule.kind} ${rule.value ?? ""}`.trim();
  }
}

/** A short "→ actions" suffix for the rules list (markers + branch colour applied), or "" if none. */
export function describeRuleActions(rule: ConditionalRule): string {
  const parts: string[] = [];
  if (rule.icons?.length) parts.push(rule.icons.join(" "));
  if (rule.branchColor) parts.push("colour");
  return parts.length ? ` → ${parts.join(" ")}` : "";
}
