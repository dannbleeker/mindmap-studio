import type { MapNode } from "./model/types";

// Task progress + roll-up (pure). A node is a "task" when it carries `task.progress` (0..1).
// A parent with task descendants shows a *rolled-up* completion: the flat average over every
// leaf task in its subtree (so it reads as "% of all tasks complete"), plus a done/total count.
// A node with no task descendants falls back to its own `task.progress` if set. Non-task nodes
// are simply absent from the map. Unit-tested; the canvas badge, Info panel, and outline all
// build on this.

export interface ProgressInfo {
  /** Rolled-up completion, 0..1. */
  progress: number;
  /** Leaf tasks at 100% within this subtree. */
  done: number;
  /** Total leaf tasks within this subtree (1 for a single leaf task). */
  total: number;
  /** True when rolled up from descendants (read-only) vs set directly on this node. */
  derived: boolean;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Compute task-progress info for every task-bearing node in a tree, keyed by node id. Pure. */
export function progressMap(root: MapNode): Map<string, ProgressInfo> {
  const map = new Map<string, ProgressInfo>();
  const visit = (node: MapNode): ProgressInfo | undefined => {
    const childInfos = node.children.map(visit).filter((x): x is ProgressInfo => x !== undefined);
    if (childInfos.length > 0) {
      // Roll up: weight each child by its leaf-task count so the result is a flat average
      // over all leaf tasks in the subtree (childInfo.progress * childInfo.total = that
      // child's summed leaf progress).
      const total = childInfos.reduce((s, c) => s + c.total, 0);
      const done = childInfos.reduce((s, c) => s + c.done, 0);
      const sum = childInfos.reduce((s, c) => s + c.progress * c.total, 0);
      const info: ProgressInfo = {
        progress: total > 0 ? sum / total : 0,
        done,
        total,
        derived: true,
      };
      map.set(node.id, info);
      return info;
    }
    // Leaf (or a parent with no task descendants): use its own progress if set.
    const own = node.task?.progress;
    if (own === undefined) return undefined;
    const p = clamp01(own);
    const info: ProgressInfo = { progress: p, done: p >= 1 ? 1 : 0, total: 1, derived: false };
    map.set(node.id, info);
    return info;
  };
  visit(root);
  return map;
}

/** Progress info for a single node, rolled up from its own subtree. Pure. */
export function nodeProgress(node: MapNode): ProgressInfo | undefined {
  return progressMap(node).get(node.id);
}

/** Does this node have any task-bearing descendant? (Then its progress is derived/read-only.) Pure. */
export function hasTaskDescendants(node: MapNode): boolean {
  return node.children.some((c) => c.task?.progress !== undefined || hasTaskDescendants(c));
}

/** Round a 0..1 fraction to a whole-percent integer (0..100). */
export function toPercent(fraction: number): number {
  return Math.round(clamp01(fraction) * 100);
}
