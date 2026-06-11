import type { MapNode, MindMapDoc } from "../model/types";

// Markdown <-> canonical model.
//
// A map serialises to one H1 (the root topic) followed by a nested bullet list
// of its descendants, two spaces per level. This round-trips the topic tree;
// per-node extras (icons, notes) live on the model, not in the markdown.

export function toMarkdown(doc: MindMapDoc): string {
  const lines = [`# ${doc.root.topic}`];
  const walk = (node: MapNode, depth: number) => {
    for (const child of node.children) {
      lines.push(`${"  ".repeat(depth)}- ${child.topic}`);
      walk(child, depth + 1);
    }
  };
  walk(doc.root, 0);
  return `${lines.join("\n")}\n`;
}

let mdId = 0;
function nextId(): string {
  mdId += 1;
  return `md${mdId}`;
}

export function fromMarkdown(md: string): MindMapDoc {
  mdId = 0;
  const root: MapNode = { id: "root", topic: "Untitled map", children: [] };
  // stack[d] = the node whose children receive a bullet at depth d+1.
  const stack: MapNode[] = [root];

  for (const raw of md.split(/\r?\n/)) {
    if (!raw.trim()) continue;

    const heading = raw.match(/^#\s+(.*)$/);
    if (heading) {
      root.topic = heading[1].trim() || root.topic;
      continue;
    }

    const bullet = raw.match(/^(\s*)[-*]\s+(.*)$/);
    if (!bullet) continue;

    const indent = bullet[1].replace(/\t/g, "  ").length;
    const depth = Math.floor(indent / 2) + 1; // top-level bullets sit under root
    const node: MapNode = { id: nextId(), topic: bullet[2].trim(), children: [] };
    const parent = stack[depth - 1] ?? root;
    parent.children.push(node);
    stack[depth] = node;
    stack.length = depth + 1; // forget anything deeper than the current line
  }

  return {
    schemaVersion: 1,
    id: nextId(),
    title: root.topic,
    root,
    meta: { source: "markdown" },
  };
}
