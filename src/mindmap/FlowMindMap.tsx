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
  useState,
} from "react";
import type { MindMapDoc } from "../model/types";
import type { LayoutKind, MindMapHandle, MindMapProps } from "./contract";
import { Boundaries } from "./flow/Boundaries";
import { BranchEdge } from "./flow/BranchEdge";
import { CrosslinkEdge } from "./flow/CrosslinkEdge";
import { TopicNode } from "./flow/TopicNode";
import { EditingContext } from "./flow/editing";
import { computeLayout, estimateSizeOf } from "./flow/layout";
import {
  type OpResult,
  addChild,
  addSibling,
  deleteNode,
  findNode,
  groupBranch,
  mergeStyle,
  outdent,
  replaceTopics,
  setAllExpanded,
  setHyperlink,
  setImage,
  setNote,
  setTopic,
  toggleCollapse,
  toggleIcon,
} from "./flow/ops";
import { project } from "./flow/project";
import type { FlowEdge, TopicNode as TopicNodeT } from "./flow/types";
import { mindManagerTheme } from "./theme";

// React Flow canvas — Phase D makes it editable: inline topic editing (double-click / F2),
// keyboard tree-building (Enter = sibling, Tab = child, Shift+Tab = outdent, Delete), and the
// model-mutating MindMapHandle methods (note/style/marker/image/link/group/replace). Every
// edit is a pure op on the canonical doc → re-project → re-layout → onChange, so the model is
// the source of truth. (Drag-to-reparent + undo are Phase E.)

const nodeTypes = { topic: TopicNode };
const edgeTypes = { branch: BranchEdge, crosslink: CrosslinkEdge };

function themeVars(theme: MindMapProps["theme"]): CSSProperties {
  const v = (theme ?? mindManagerTheme).cssVar;
  return {
    "--mm-node-bg": v["--bgcolor"],
    "--mm-color": v["--color"],
    "--mm-root-bg": v["--root-bgcolor"],
    "--mm-root-color": v["--root-color"],
    "--mm-line-color": v["--line-color"],
    background: v["--main-bgcolor"],
  } as CSSProperties;
}

function FlowInner({ doc, theme, direction = "side", onChange, onSelect, ref }: MindMapProps) {
  const palette = (theme ?? mindManagerTheme).palette;
  const projected = useMemo(() => project(doc, palette), [doc, palette]);
  const initialNodes = useMemo(() => {
    const pos = computeLayout(
      projected.nodes,
      projected.edges,
      estimateSizeOf(projected.nodes),
      direction,
    );
    return projected.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position }));
    // direction included so a fresh mount honours it; live changes handled by the effect below.
  }, [projected, direction]);
  const [nodes, setNodes, onNodesChange] = useNodesState<TopicNodeT>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(projected.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { fitView, getNodes, setCenter } = useReactFlow();
  const initialized = useNodesInitialized();

  // Refs so the stable callbacks below always read the latest values.
  const docRef = useRef(doc);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  const directionRef = useRef<LayoutKind>(direction);
  directionRef.current = direction;
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const editingRef = useRef<string | null>(null);
  editingRef.current = editingId;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Re-project + re-layout from a doc (with measured sizes when available, else estimated).
  const sync = useCallback(
    (newDoc: MindMapDoc, nextSelected?: string | null) => {
      docRef.current = newDoc;
      if (nextSelected !== undefined) selectedRef.current = nextSelected;
      const proj = project(newDoc, paletteRef.current);
      const est = estimateSizeOf(proj.nodes);
      const measured = getNodes();
      const sizeOf = (id: string) => {
        const m = measured.find((n) => n.id === id);
        return m?.measured?.width && m?.measured?.height
          ? { width: m.measured.width, height: m.measured.height }
          : est(id);
      };
      const pos = computeLayout(proj.nodes, proj.edges, sizeOf, directionRef.current);
      const sel = selectedRef.current;
      setNodes(
        proj.nodes.map((n) => ({
          ...n,
          position: pos.get(n.id) ?? { x: 0, y: 0 },
          selected: n.id === sel,
        })),
      );
      setEdges(proj.edges);
    },
    [getNodes, setNodes, setEdges],
  );

  const fireSelect = useCallback((id: string | null) => {
    const n = id ? findNode(docRef.current, id) : null;
    onSelectRef.current?.(n ? { id: n.id, topic: n.topic, note: n.note ?? "" } : null);
  }, []);

  // Apply a pure op: persist + re-render; optionally enter edit on the resulting node.
  const apply = useCallback(
    (result: OpResult, edit = false) => {
      if (result.doc !== docRef.current) {
        sync(result.doc, result.selectId);
        onChangeRef.current?.(result.doc);
      }
      if (result.selectId !== undefined) {
        setSelectedId(result.selectId);
        fireSelect(result.selectId);
        if (edit) setEditingId(result.selectId);
      }
    },
    [sync, fireSelect],
  );

  // Editing API for the topic nodes.
  const editingApi = useMemo(
    () => ({
      editingId,
      beginEdit: (id: string) => setEditingId(id),
      cancelEdit: () => setEditingId(null),
      commitEdit: (id: string, text: string) => {
        setEditingId(null);
        const n = id ? findNode(docRef.current, id) : null;
        if (n && n.topic !== text) apply(setTopic(docRef.current, id, text));
      },
      commitAndAdd: (id: string, text: string, what: "sibling" | "child") => {
        let d = docRef.current;
        const n = findNode(d, id);
        if (n && n.topic !== text) d = setTopic(d, id, text).doc;
        apply(what === "child" ? addChild(d, id) : addSibling(d, id), true);
      },
      toggleCollapse: (id: string) => apply(toggleCollapse(docRef.current, id)),
    }),
    [editingId, apply],
  );

  // Keep node selection flags in sync with selectedId (no re-layout).
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.selected === (n.id === selectedId) ? n : { ...n, selected: n.id === selectedId },
      ),
    );
  }, [selectedId, setNodes]);

  // Re-layout on a live layout-kind change (initial mount is already laid out).
  const firstRun = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `direction` is the trigger; sync reads directionRef.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    sync(docRef.current);
    requestAnimationFrame(() => fitView({ duration: 300 }));
  }, [direction, sync, fitView]);

  // One-time refine once React Flow has measured the nodes (better sizing than estimates).
  const refined = useRef(false);
  useEffect(() => {
    if (!initialized || refined.current) return;
    refined.current = true;
    sync(docRef.current);
  }, [initialized, sync]);

  // Keyboard tree-building (when a node is selected and we're not inline-editing or in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingRef.current) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)))
        return;
      const id = selectedRef.current;
      if (!id) return;
      if (e.key === "Enter") {
        e.preventDefault();
        apply(addSibling(docRef.current, id), true);
      } else if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        apply(addChild(docRef.current, id), true);
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        apply(outdent(docRef.current, id));
      } else if (e.key === "Delete") {
        e.preventDefault();
        apply(deleteNode(docRef.current, id));
      } else if (e.key === "F2") {
        e.preventDefault();
        setEditingId(id);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [apply]);

  const withSelected = useCallback((fn: (id: string) => void): boolean => {
    const id = selectedRef.current;
    if (!id) return false;
    fn(id);
    return true;
  }, []);

  useImperativeHandle(
    ref,
    (): MindMapHandle => ({
      exportSvg: () => null, // Phase F
      fit: () => fitView({ duration: 300 }),
      focusNode: (id: string) => {
        const n = getNodes().find((m) => m.id === id);
        if (!n) return;
        setSelectedId(id);
        fireSelect(id);
        const w = n.measured?.width ?? 0;
        const h = n.measured?.height ?? 0;
        setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: 1, duration: 300 });
      },
      setSelectedImage: (image) => withSelected((id) => apply(setImage(docRef.current, id, image))),
      setSelectedNote: (note) => withSelected((id) => apply(setNote(docRef.current, id, note))),
      toggleSelectedIcon: (icon) =>
        withSelected((id) => apply(toggleIcon(docRef.current, id, icon))),
      replaceTopics: (query, replacement) => {
        const res = replaceTopics(docRef.current, query, replacement);
        if (res.count > 0) apply({ doc: res.doc });
        return res.count;
      },
      setAllExpanded: (expanded) => apply(setAllExpanded(docRef.current, expanded)),
      setSelectedStyle: (patch) =>
        withSelected((id) => apply(mergeStyle(docRef.current, id, patch))),
      setSelectedHyperlink: (url) =>
        withSelected((id) => apply(setHyperlink(docRef.current, id, url))),
      groupBranch: (id) => {
        apply(groupBranch(docRef.current, id));
        return Boolean(findNode(docRef.current, id));
      },
    }),
    [fitView, getNodes, setCenter, apply, fireSelect, withSelected],
  );

  return (
    <EditingContext.Provider value={editingApi}>
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
          deleteKeyCode={null}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={3}
          fitView
          onNodeClick={(_, node) => {
            setSelectedId(node.id);
            fireSelect(node.id);
          }}
          onPaneClick={() => {
            setSelectedId(null);
            fireSelect(null);
          }}
        >
          <Background color="var(--mm-line-color, #d8d8d8)" gap={24} />
          <Boundaries boundaries={doc.boundaries ?? []} />
        </ReactFlow>
      </div>
    </EditingContext.Provider>
  );
}

export function FlowMindMap(props: MindMapProps) {
  return (
    <ReactFlowProvider>
      <FlowInner key={props.doc.id} {...props} />
    </ReactFlowProvider>
  );
}
