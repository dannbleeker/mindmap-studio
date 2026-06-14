import "@xyflow/react/dist/style.css";
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import type { LayoutKind, MindMapHandle, MindMapProps } from "./contract";
import { Boundaries } from "./flow/Boundaries";
import { BranchEdge } from "./flow/BranchEdge";
import { CrosslinkEdge } from "./flow/CrosslinkEdge";
import { TopicNode } from "./flow/TopicNode";
import { computeLayout, estimateSizeOf } from "./flow/layout";
import { project } from "./flow/project";
import { mindManagerTheme } from "./theme";

// React Flow canvas (Phase B: read-only render at parity). project() turns the model into
// nodes/edges, computeLayout() positions them once they've measured, and custom node/edge
// types give the MindManager look (coloured tapered branches, boundary boxes). Editing,
// alternate layouts, callouts, rich-text and a real SVG export land in later phases — all
// behind the unchanged MindMapHandle contract.

const nodeTypes = { topic: TopicNode };
const edgeTypes = { branch: BranchEdge, crosslink: CrosslinkEdge };

// Phase B is read-only; the mutating handle methods are wired in Phase D.
function noopHandle(over: Partial<MindMapHandle>): MindMapHandle {
  return {
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
    ...over,
  };
}

/** Map the (mind-elixir-shaped) theme to the React Flow canvas's CSS custom properties. */
function themeVars(theme: MindMapProps["theme"]): CSSProperties {
  const v = (theme ?? mindManagerTheme).cssVar;
  return {
    "--mm-node-bg": v["--bgcolor"],
    "--mm-color": v["--color"],
    "--mm-root-bg": v["--root-bgcolor"],
    "--mm-root-color": v["--root-color"],
    background: v["--main-bgcolor"],
  } as CSSProperties;
}

function FlowInner({ doc, theme, direction = "side", ref }: MindMapProps) {
  const palette = (theme ?? mindManagerTheme).palette;
  const projected = useMemo(() => project(doc, palette), [doc, palette]);
  // Lay out immediately with estimated sizes so the first frame is already positioned
  // (no blank canvas, no reliance on a measurement callback). Measured sizes refine below.
  const initialNodes = useMemo(() => {
    const pos = computeLayout(
      projected.nodes,
      projected.edges,
      estimateSizeOf(projected.nodes),
      direction,
    );
    return projected.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position }));
  }, [projected, direction]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(projected.edges);
  const { fitView, getNodes, setCenter } = useReactFlow();
  const initialized = useNodesInitialized();

  // Re-run the layout (with measured sizes when available, else estimated) and re-fit.
  const relayout = useCallback(
    (kind: LayoutKind) => {
      const measured = getNodes();
      const anyMeasured = measured.some((n) => n.measured?.width);
      const sizeOf = anyMeasured
        ? (id: string) => {
            const m = measured.find((n) => n.id === id);
            return { width: m?.measured?.width ?? 0, height: m?.measured?.height ?? 0 };
          }
        : estimateSizeOf(projected.nodes);
      const pos = computeLayout(projected.nodes, projected.edges, sizeOf, kind);
      setNodes((nds) => nds.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })));
      requestAnimationFrame(() => fitView({ duration: 300 }));
    },
    [projected, getNodes, setNodes, fitView],
  );

  // Re-layout when the layout kind changes (the initial render is already laid out).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    relayout(direction);
  }, [direction, relayout]);

  // Refine with measured sizes once React Flow has measured the nodes (best-effort).
  const refined = useRef(false);
  useEffect(() => {
    if (!initialized || refined.current) return;
    refined.current = true;
    relayout(direction);
  }, [initialized, direction, relayout]);

  useImperativeHandle(
    ref,
    () =>
      noopHandle({
        fit: () => fitView({ duration: 300 }),
        focusNode: (id: string) => {
          const n = getNodes().find((m) => m.id === id);
          if (!n) return;
          const w = n.measured?.width ?? 0;
          const h = n.measured?.height ?? 0;
          setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: 1, duration: 300 });
        },
      }),
    [fitView, getNodes, setCenter],
  );

  return (
    <div style={{ height: "100%", width: "100%", ...themeVars(theme) }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        // Attribution removal is permitted for the MIT React Flow core.
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={3}
        fitView
      >
        <Background color="var(--mm-line-color, #d8d8d8)" gap={24} />
        <Boundaries boundaries={doc.boundaries ?? []} />
      </ReactFlow>
    </div>
  );
}

export function FlowMindMap(props: MindMapProps) {
  return (
    <ReactFlowProvider>
      <FlowInner key={props.doc.id} {...props} />
    </ReactFlowProvider>
  );
}
