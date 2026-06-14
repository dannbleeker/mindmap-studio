import "@xyflow/react/dist/style.css";
import { Background, type Edge, type Node, ReactFlow } from "@xyflow/react";
import { useImperativeHandle, useMemo } from "react";
import type { MapNode } from "../model/types";
import type { MindMapHandle, MindMapProps } from "./contract";

// Phase A spike — a throwaway read-only projection that proves React Flow renders the
// canonical model and lands in its own lazy chunk (off the entry-size budget). Phase B
// replaces this with the real projection + custom nodes/edges + the layout engine, and
// later phases implement the editing surface behind this same MindMapHandle contract.

const NOOP_HANDLE: MindMapHandle = {
  exportSvg: () => null,
  focusNode: () => {},
  fit: () => {},
  setSelectedImage: () => false,
  setSelectedNote: () => false,
  toggleSelectedIcon: () => false,
  replaceTopics: () => 0,
  setAllExpanded: () => {},
  setSelectedStyle: () => false,
  setSelectedHyperlink: () => false,
  groupBranch: () => false,
};

function project(root: MapNode): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let row = 0;
  const walk = (node: MapNode, depth: number, parentId?: string) => {
    nodes.push({
      id: node.id,
      position: { x: depth * 220, y: row * 56 },
      data: { label: node.topic },
    });
    row += 1;
    if (parentId) edges.push({ id: `e:${parentId}:${node.id}`, source: parentId, target: node.id });
    for (const child of node.children) walk(child, depth + 1, node.id);
  };
  walk(root, 0);
  return { nodes, edges };
}

export function FlowMindMap({ doc, ref }: MindMapProps) {
  useImperativeHandle(ref, () => NOOP_HANDLE, []);
  const { nodes, edges } = useMemo(() => project(doc.root), [doc.root]);
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
      </ReactFlow>
    </div>
  );
}
