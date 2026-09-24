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

/** Which edge of the selected node the action bar (NodePopover) aligns to, so it stays on-screen.
 *  Centred by default; a node near the pane's left/right edge would push a centred bar off-screen
 *  (on a phone the 7-button touch bar is ~300px — most of the width), so it anchors to that node's
 *  near edge instead and grows inward. All values are pane-relative screen pixels. */
export function popoverAlign(
  nodeLeft: number,
  nodeRight: number,
  paneWidth: number,
  barWidth: number,
): "start" | "center" | "end" {
  const centre = (nodeLeft + nodeRight) / 2;
  if (centre - barWidth / 2 < 0) return "start";
  if (centre + barWidth / 2 > paneWidth) return "end";
  return "center";
}
