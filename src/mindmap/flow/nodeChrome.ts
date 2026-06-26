// Pure visibility rules for a topic node's on-canvas chrome (the hover action bar + the ＋ add
// affordances). Kept out of TopicNode.tsx so the gating is unit-testable and has one source of truth.

/** Whether to show a node's per-node affordances (the 📝/⚑ action bar and the ＋ add buttons).
 *  Shown while hovering any node, or while a SINGLE node is selected — but never while editing, and
 *  never on the members of a multi-selection (a branch/marquee select would otherwise pop a bar on
 *  every node at once, burying the map). The shared selection toolbar covers bulk actions instead. */
export function showNodeAffordances(
  hovered: boolean,
  selected: boolean,
  multiSelected: boolean,
  isEditing: boolean,
): boolean {
  if (isEditing) return false;
  if (hovered) return true;
  return selected && !multiSelected;
}
