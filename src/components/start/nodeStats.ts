import type { MapNode, MindMapDoc } from "../../model/types";

// Pure helpers the cards use to describe a map/template from its real tree (so a template's node
// count + branch pills are computed, never hardcoded).

/** Total nodes in a subtree (the node + all descendants). */
export function countNodes(node: MapNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

/** Total nodes in a doc (the central tree + any floating topics). */
export function docNodeCount(doc: MindMapDoc): number {
  const floating = doc.floatingTopics?.reduce((sum, f) => sum + countNodes(f), 0) ?? 0;
  return countNodes(doc.root) + floating;
}

/** The root's direct children's topics — the "branch preview" pills. */
export function branchLabels(doc: MindMapDoc): string[] {
  return doc.root.children.map((c) => c.topic);
}
