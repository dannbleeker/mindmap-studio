import "@xyflow/react/dist/style.css";
import {
  ConnectionMode,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
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
import { ContextMenu, MenuItem, MenuLabel, MenuSeparator } from "../design/primitives";
import { colors } from "../design/tokens";
import { MARKER_PALETTE, markerImage } from "../icons";
import { hasFormatting, richToPlain, sanitizeRich } from "../io/richText";
import { isDangerousUrl } from "../io/urlSafety";
import type { Boundary, MapNode, MindMapDoc, Summary } from "../model/types";
import { PRIORITY_LABEL, PRIORITY_LEVELS, cyclePriority } from "../priority";
import { cycleTaskProgress, nextProgressLevel } from "../progress";
import { getBranch, setBranch } from "../store/branchClipboard";
import { todayISO } from "../taskDate";
import { useIsMobile } from "../useIsMobile";
import {
  type CanvasSession,
  type MindMapHandle,
  type MindMapProps,
  type SelectedOverlay,
  classifyLink,
} from "./contract";
import { BackgroundImage } from "./flow/BackgroundImage";
import { Boundaries } from "./flow/Boundaries";
import { BraceConnectors } from "./flow/BraceConnectors";
import { BranchEdge } from "./flow/BranchEdge";
import { type CalloutAnchor, Callouts } from "./flow/Callouts";
import { CoachMark, DropLabel, LegendPanel, MinimapPanel, StatusBar } from "./flow/CanvasOverlays";
import { CrosslinkEdge } from "./flow/CrosslinkEdge";
import { DiagramBackdrop } from "./flow/DiagramBackdrop";
import { NodePopover } from "./flow/NodePopover";
import { Summaries } from "./flow/Summaries";
import { TopicNode } from "./flow/TopicNode";
import { LAYOUT_ANIM_MS, easeInOutCubic, lerp, prefersReducedMotion } from "./flow/animateLayout";
import { type BraceGroup, computeBraces } from "./flow/brace";
import { buildFlowState } from "./flow/buildFlowState";
import { resolveDropTarget } from "./flow/dropTarget";
import { EditingContext } from "./flow/editing";
import { type NodeRect, buildFlowSvg } from "./flow/exportSvg";
import { nodeAtPoint } from "./flow/floating";
import {
  type History,
  createHistory,
  record,
  redo as redoHistory,
  undo as undoHistory,
} from "./flow/history";
import { keyIntent } from "./flow/keyIntent";
import { computeLayout, estimateSizeOf } from "./flow/layout";
import { LinkEditContext } from "./flow/linkEdit";
import {
  type OpResult,
  addAttachment,
  addCallout,
  addChild,
  addFloatingTopic,
  addLink,
  addSibling,
  addStickyNote,
  addSubtree,
  alignNodes,
  assignBranchColors,
  balanceMap,
  bulkToggleIcon,
  bulkToggleTag,
  clearBackdrop,
  deleteBoundary,
  deleteCallout,
  deleteLink,
  deleteNode,
  deleteSummary,
  deleteTag,
  detachBranch,
  distributeNodes,
  findAnyNode,
  findNode,
  groupBranch,
  groupNodes,
  groupSummary,
  indent,
  isolateBranch,
  mergeStyle,
  moveInTree,
  moveSibling,
  nextSelectionId,
  outdent,
  pasteBranch,
  removeAttachment,
  renameTag,
  reparent,
  replaceTopics,
  selectionFields,
  selectionMarkers,
  selectionTags,
  setAccentColor,
  setAllExpanded,
  setBackdrop,
  setBackdropColor,
  setBackdropRings,
  setBackground,
  setBackgroundImage,
  setBoundaryColor,
  setBoundaryDash,
  setBoundaryLabel,
  setBoundaryShape,
  setBranchColor,
  setBranchGrowth,
  setCalloutColor,
  setCalloutText,
  setConnectorStyle,
  setDue,
  setExpandedToLevel,
  setFontFamily,
  setFontScale,
  setFreeform,
  setHyperlink,
  setImage,
  setLegend,
  setLineDash,
  setLineJumps,
  setLinkArrow,
  setLinkLabel,
  setLinkStyle,
  setNodeLayout,
  setNodePos,
  setNodePositions,
  setNodeSide,
  setNote,
  setNumberStyle,
  setPriority,
  setProgress,
  setRollup,
  setRules,
  setSlides,
  setStart,
  setSummaryColor,
  setSummaryLabel,
  setTags,
  setTopic,
  setTopicRich,
  toggleCollapse,
  toggleIcon,
  toggleLocked,
  viewDoc,
} from "./flow/ops";
import type { NodeSizes } from "./flow/ops";
import { project } from "./flow/project";
import {
  type OverlaySelect,
  resolveSelectedEdge,
  resolveSelectedNode,
  resolveSelectedOverlay,
} from "./flow/selectionResolve";
import { type GuideLine, computeSnap } from "./flow/snap";
import type { EdgeData, FlowEdge, TopicNode as TopicNodeT } from "./flow/types";
import { useLatestRef } from "./flow/useLatestRef";
import { mindManagerTheme } from "./theme";

// React Flow canvas — a fully editable engine. Inline topic editing (double-click / F2),
// keyboard tree-building (Enter/Tab/Shift+Tab/Delete), drag-to-reparent, a right-click context
// menu, undo/redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, doc-snapshot stack), theming via CSS vars,
// SVG export (native <text>, authored from the model + live node rects), and the model-mutating
// MindMapHandle methods. Every edit is a pure op on the canonical doc → re-project → re-layout →
// onChange, so the model is the single source of truth.

const nodeTypes = { topic: TopicNode };
const edgeTypes = { branch: BranchEdge, crosslink: CrosslinkEdge };

// Per-overlay-kind op table: routes a label / colour / delete edit to the right boundary / summary /
// callout op, so the three-way kind dispatch lives in ONE place instead of being re-spelled in each
// overlay handle method (add a 4th overlay kind → one entry here, not three edits).
const OVERLAY_OPS: Record<
  SelectedOverlay["kind"],
  {
    label: (
      doc: MindMapDoc,
      sel: SelectedOverlay,
      value: string,
    ) => ReturnType<typeof setBoundaryLabel>;
    color: (
      doc: MindMapDoc,
      sel: SelectedOverlay,
      value: string,
    ) => ReturnType<typeof setBoundaryColor>;
    del: (doc: MindMapDoc, sel: SelectedOverlay) => ReturnType<typeof deleteBoundary>;
  }
> = {
  boundary: {
    label: (d, s, v) => setBoundaryLabel(d, s.id, v),
    color: (d, s, v) => setBoundaryColor(d, s.id, v),
    del: (d, s) => deleteBoundary(d, s.id),
  },
  summary: {
    label: (d, s, v) => setSummaryLabel(d, s.id, v),
    color: (d, s, v) => setSummaryColor(d, s.id, v),
    del: (d, s) => deleteSummary(d, s.id),
  },
  callout: {
    label: (d, s, v) => setCalloutText(d, s.nodeId ?? "", s.id, v),
    color: (d, s, v) => setCalloutColor(d, s.nodeId ?? "", s.id, v),
    del: (d, s) => deleteCallout(d, s.nodeId ?? "", s.id),
  },
};

// Shared empty arrays so the boundary/summary overlays get a stable prop ref when the doc has none
// (a fresh `[]` each render would defeat their React.memo). Frozen to flag them as never-mutated.
const EMPTY_BOUNDARIES: readonly Boundary[] = Object.freeze([]);
const EMPTY_SUMMARIES: readonly Summary[] = Object.freeze([]);

// Keyboard hints shown right-aligned on the matching right-click menu rows (#2) — kept in step with
// the canvas keydown handler + the cheat-sheet (src/shortcuts.ts).
const MENU_SHORTCUT: Record<string, string> = {
  "Add child": "Tab",
  "Add sibling": "Enter",
  Rename: "F2",
  Delete: "Del",
};

/** Count all descendants of a node (the size of the branch beneath it) — drives the delete toast. */
function countDescendants(n: MapNode): number {
  let total = 0;
  for (const k of n.children) total += 1 + countDescendants(k);
  return total;
}

/** The id of a node and every node beneath it — a drag-to-reparent can't target its own subtree. */
function subtreeIds(node: MapNode | null): Set<string> {
  const ids = new Set<string>();
  const walk = (n: MapNode) => {
    ids.add(n.id);
    for (const c of n.children) walk(c);
  };
  if (node) walk(node);
  return ids;
}

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

function FlowInner({
  doc,
  theme,
  direction = "side",
  numbered = false,
  spellcheck = false,
  litIds = null,
  hideUnmatched = false,
  highlightIds = null,
  drillId = null,
  onChange,
  onSelect,
  onSelectionCount,
  onSelectionFields,
  onSelectionMarkerTags,
  onSelectEdge,
  onSelectOverlay,
  onOpenNote,
  onMapLink,
  onDropFilesOnNode,
  onHistory,
  onDelete,
  initialSession,
  ref,
}: MindMapProps) {
  const palette = (theme ?? mindManagerTheme).palette;
  const isMobile = useIsMobile();
  // Drill-in (#4): re-root the *view* at `drillId` so its subtree fills the canvas. `viewDoc` returns
  // the full doc unchanged when not drilled, so the normal path is untouched; edits still run on the
  // full doc (docRef), making drilling a pure view transform.
  const viewOf = useMemo(() => viewDoc(doc, drillId), [doc, drillId]);
  const projected = useMemo(
    () => project(viewOf, palette, numbered, viewOf.meta?.freeform ? "freeform" : direction),
    [viewOf, palette, numbered, direction],
  );
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
  // Multi-selection: this set drives the canvas selection flags; `selectedId` is the anchor (the
  // last-touched node) that every single-node behaviour — keyboard, popover, per-item edits — keeps
  // using. For a single selection the set is just {anchor}.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  // The selected relationship (cross-link) edge, if any. Mutually exclusive with node selection —
  // selecting an edge clears the node anchor/set and vice-versa; drives the EdgeInspector + the halo.
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // The selected overlay object (boundary / summary / callout), if any. The 4th selection channel —
  // mutually exclusive with node + edge; drives the OverlayInspector + the overlay halo.
  const [selectedOverlay, setSelectedOverlay] = useState<SelectedOverlay | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // When edit was started by typing on a selected node, the character to seed the editor with
  // (caret at end); null for a normal edit (double-click / F2 / new node → seed topic, select all).
  const [editSeed, setEditSeed] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  // While set, the next node click completes a relationship from this node (the "Link to…" gesture).
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  // The corner minimap can be collapsed (it covers dense maps); the choice persists.
  const [minimapOpen, setMinimapOpen] = useState(() => {
    try {
      return localStorage.getItem("mindmap-minimap-open") !== "false";
    } catch {
      return true;
    }
  });
  const toggleMinimap = () =>
    setMinimapOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem("mindmap-minimap-open", String(next));
      } catch {
        // preference is best-effort
      }
      return next;
    });
  // The current doc, mirrored for render-time consumers (boundary + callout overlays). The
  // canvas is model-first: edits update docRef + RF state via sync(); App keeps the `doc` prop
  // stable during a session, so the overlays must track this live copy, not the prop.
  const [renderDoc, setRenderDoc] = useState(doc);
  // The empty-map coachmark (#1) is dismissed for good on the first edit (any path into edit mode).
  const [coachDismissed, setCoachDismissed] = useState(false);
  // During a drag-to-reparent, the node the dragged topic would drop under (highlighted live). (#11)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  // During a drag-to-reorder, the sibling edge an insertion line marks (drop before/after). (#8)
  const [insertEdge, setInsertEdge] = useState<{ id: string; after: boolean } | null>(null);
  // Free-canvas alignment guide lines shown while dragging (cleared on drag stop).
  const [guides, setGuides] = useState<GuideLine[]>([]);
  // The cross-link whose label is being inline-edited on the canvas (double-click), or null.
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const { fitView, getNodes, setCenter, getViewport, setViewport, screenToFlowPosition } =
    useReactFlow();
  const initialized = useNodesInitialized();

  // Refs so the stable callbacks below always read the latest values.
  const docRef = useRef(doc);
  // Seed from a restored tab session (lossless tab switching) when one is supplied; else fresh.
  // Captured once at mount: App deletes the cached session right after restore (one-shot), so reading
  // the live prop later would flip ReactFlow's fitView false→true and re-fit away the restored
  // viewport. FlowInner remounts on a real tab/version change (its key), so this stays correct.
  const mountSession = useRef(initialSession);
  const historyRef = useRef<History<MindMapDoc>>(
    mountSession.current?.history ?? createHistory<MindMapDoc>(),
  );
  // Mirror refs: each tracks the latest prop/state so the stable callbacks below read live values
  // without re-creating. (docRef/historyRef/mountSession are NOT mirrors — they hold their own state.)
  const paletteRef = useLatestRef(palette);
  const directionRef = useLatestRef(direction);
  const drillIdRef = useLatestRef(drillId);
  const numberedRef = useLatestRef(numbered);
  const litIdsRef = useLatestRef(litIds);
  const hideUnmatchedRef = useLatestRef(hideUnmatched);
  const highlightIdsRef = useLatestRef(highlightIds);
  const selectedRef = useLatestRef(selectedId);
  const selectedIdsRef = useLatestRef(selectedIds);
  const selectedEdgeIdRef = useLatestRef(selectedEdgeId);
  const onSelectEdgeRef = useLatestRef(onSelectEdge);
  const selectedOverlayRef = useLatestRef(selectedOverlay);
  const onSelectOverlayRef = useLatestRef(onSelectOverlay);
  const editingRef = useLatestRef(editingId);
  const linkingFromRef = useLatestRef(linkingFrom);
  const onChangeRef = useLatestRef(onChange);
  const onSelectRef = useLatestRef(onSelect);
  const onMapLinkRef = useLatestRef(onMapLink);
  const onOpenNoteRef = useLatestRef(onOpenNote);
  const onDropFilesOnNodeRef = useLatestRef(onDropFilesOnNode);
  const onHistoryRef = useLatestRef(onHistory);
  const onDeleteRef = useLatestRef(onDelete);
  // On mount, report the (possibly restored) history depths so the chrome's undo/redo buttons match a
  // restored tab session. A fresh canvas reports nothing-to-undo, which is also correct.
  useEffect(() => {
    const h = historyRef.current;
    onHistoryRef.current?.(h.past.length > 0, h.future.length > 0);
  }, []);
  const themeRef = useLatestRef(theme);

  // Layout-transition tween bookkeeping (#16): the in-flight rAF id + the loop's start timestamp.
  const layoutRaf = useRef<number | null>(null);
  const layoutStart = useRef<number | null>(null);
  // Cancel a running tween if the canvas unmounts mid-animation.
  useEffect(
    () => () => {
      if (layoutRaf.current != null) cancelAnimationFrame(layoutRaf.current);
    },
    [],
  );

  // Re-project + re-layout from a doc (with measured sizes when available, else estimated).
  const sync = useCallback(
    (newDoc: MindMapDoc, nextSelected?: string | null, animate = false) => {
      // Cancel any in-flight layout tween — a fresh sync supersedes it (whether it animates or not).
      if (layoutRaf.current != null) {
        cancelAnimationFrame(layoutRaf.current);
        layoutRaf.current = null;
      }
      docRef.current = newDoc;
      // The view is re-rooted when drilled (pure transform); docRef stays the FULL doc so every edit,
      // undo, and onChange still operate on the whole map. Overlays read renderDoc, so it's the view.
      const view = viewDoc(newDoc, drillIdRef.current);
      setRenderDoc(view);
      // A structural op passes its result node as the next anchor → selection collapses to it. A
      // bulk edit passes nothing → the multi-selection set is preserved across the re-render.
      if (nextSelected !== undefined) {
        selectedRef.current = nextSelected;
        selectedIdsRef.current = nextSelected ? new Set([nextSelected]) : new Set();
      }
      // Free-canvas mode overrides the picked layout: nodes sit at their own `pos`. The kind also
      // drives project()'s org-chart elbow stamping, so compute it before projecting.
      const kind = newDoc.meta?.freeform ? "freeform" : directionRef.current;
      // The whole model→canvas transform (project → layout → attachSide/attachBow → selection/dimming
      // flags) is the pure, unit-tested buildFlowState(); sync() only owns the React side effects.
      const { nodes, edges } = buildFlowState({
        doc: view,
        palette: paletteRef.current,
        numbered: numberedRef.current,
        kind,
        measured: getNodes(),
        selectedIds: selectedIdsRef.current,
        selectedEdgeId: selectedEdgeIdRef.current,
        litIds: litIdsRef.current,
        hideUnmatched: hideUnmatchedRef.current,
        highlightIds: highlightIdsRef.current,
      });
      // Edges follow the live node positions, so set them once up front; the nodes either snap or tween.
      setEdges(edges);
      const from = animate ? new Map(getNodes().map((n) => [n.id, n.position])) : null;
      const moves =
        !!from &&
        !prefersReducedMotion() &&
        nodes.some((n) => {
          const f = from.get(n.id);
          return f && (f.x !== n.position.x || f.y !== n.position.y);
        });
      if (!moves) {
        setNodes(nodes);
        return;
      }
      // Tween every node that exists in both the old + new layout from its old position to its new one;
      // nodes that just appeared (expand) start at their target. One rAF loop, eased, ~240ms.
      const tick = (now: number) => {
        if (layoutStart.current == null) layoutStart.current = now;
        const t = Math.min(1, (now - layoutStart.current) / LAYOUT_ANIM_MS);
        const e = easeInOutCubic(t);
        setNodes(
          nodes.map((n) => {
            const f = from?.get(n.id);
            return f
              ? { ...n, position: { x: lerp(f.x, n.position.x, e), y: lerp(f.y, n.position.y, e) } }
              : n;
          }),
        );
        if (t < 1) {
          layoutRaf.current = requestAnimationFrame(tick);
        } else {
          layoutRaf.current = null;
          layoutStart.current = null;
        }
      };
      layoutStart.current = null;
      layoutRaf.current = requestAnimationFrame(tick);
    },
    [getNodes, setNodes, setEdges],
  );

  // Re-project + refit when the drill target changes (enter / exit / switch). Skips the initial mount
  // so it doesn't fight the restored-session viewport; thereafter a drill change re-roots and fits.
  const drillMounted = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: sync reads drillIdRef; refit only on change.
  useEffect(() => {
    if (!drillMounted.current) {
      drillMounted.current = true;
      return;
    }
    sync(docRef.current);
    const raf = requestAnimationFrame(() => fitView({ duration: 300 }));
    return () => cancelAnimationFrame(raf);
  }, [drillId, sync, fitView]);

  const fireSelect = useCallback((id: string | null) => {
    onSelectRef.current?.(resolveSelectedNode(docRef.current, id));
  }, []);

  // Emit the selected relationship (resolved, defaults filled) to the app's EdgeInspector, or null.
  const fireSelectEdge = useCallback((id: string | null) => {
    onSelectEdgeRef.current?.(resolveSelectedEdge(docRef.current, id));
  }, []);

  // Clear any selected relationship (when a node / the pane is selected — they're mutually exclusive).
  const clearEdgeSelection = useCallback(() => {
    if (selectedEdgeIdRef.current !== null) {
      setSelectedEdgeId(null);
      onSelectEdgeRef.current?.(null);
    }
  }, []);

  // Resolve + emit the selected overlay (boundary/summary/callout) to the OverlayInspector, or null.
  // The label is the raw stored value (the inspector edits it; the canvas applies display defaults).
  const fireSelectOverlay = useCallback((sel: OverlaySelect | null) => {
    if (!sel) {
      setSelectedOverlay(null);
      onSelectOverlayRef.current?.(null);
      return;
    }
    const resolved = resolveSelectedOverlay(docRef.current, sel);
    if (!resolved) return; // the overlay is gone — leave the current selection unchanged
    setSelectedOverlay(resolved);
    onSelectOverlayRef.current?.(resolved);
  }, []);

  // Clear any selected overlay (mutually exclusive with node + edge selection).
  const clearOverlaySelection = useCallback(() => {
    if (selectedOverlayRef.current !== null) {
      setSelectedOverlay(null);
      onSelectOverlayRef.current?.(null);
    }
  }, []);

  // Collapse the selection to a single anchor (the single-select path), or clear it (id = null).
  const selectOnly = useCallback((id: string | null) => {
    setSelectedId(id);
    setSelectedIds(id ? new Set([id]) : new Set());
  }, []);

  // Mirror React Flow's own selection (marquee drag-select + Shift/Ctrl-click) into our set. Guarded
  // by a set-equality check so the round-trip with the selection-flag effect can't loop: once the
  // flags match the set, RF re-fires this with the same ids and we bail.
  const onSelectionChange = useCallback(
    ({ nodes: selNodes }: { nodes: { id: string }[] }) => {
      const ids = new Set(selNodes.map((n) => n.id));
      const cur = selectedIdsRef.current;
      if (ids.size === cur.size && [...ids].every((x) => cur.has(x))) return;
      if (ids.size > 0) {
        // node selection is mutually exclusive with edge + overlay
        clearEdgeSelection();
        clearOverlaySelection();
      }
      setSelectedIds(ids);
      // Keep the anchor if it's still selected, else adopt the most-recently-selected node.
      const anchor =
        selectedRef.current && ids.has(selectedRef.current)
          ? selectedRef.current
          : (selNodes[selNodes.length - 1]?.id ?? null);
      setSelectedId(anchor);
      fireSelect(anchor);
    },
    [fireSelect, clearEdgeSelection, clearOverlaySelection],
  );

  // Push the current undo/redo depths up so the Row-1 undo/redo buttons can live-enable/disable (#8).
  const reportHistory = useCallback(() => {
    const h = historyRef.current;
    onHistoryRef.current?.(h.past.length > 0, h.future.length > 0);
  }, []);

  // Apply a pure op: persist + re-render; optionally enter edit on the resulting node.
  const apply = useCallback(
    (result: OpResult, edit = false, animate = false) => {
      if (result.doc !== docRef.current) {
        historyRef.current = record(historyRef.current, docRef.current); // snapshot the old doc
        reportHistory();
        sync(result.doc, result.selectId, animate);
        onChangeRef.current?.(result.doc);
      }
      if (result.selectId !== undefined) {
        selectOnly(result.selectId);
        fireSelect(result.selectId);
        if (edit) {
          setEditSeed(null); // a new node seeds with its (empty) topic, not a leftover typed char
          setEditingId(result.selectId);
        }
      }
    },
    [sync, fireSelect, selectOnly, reportHistory],
  );

  // Enter inline edit for a node; `seed` is the character to start typing with (type-to-edit),
  // or null for a normal edit (seed the existing topic + select all).
  const startEdit = useCallback((id: string, seed: string | null = null) => {
    setEditSeed(seed);
    setEditingId(id);
  }, []);

  // Undo/redo restore a snapshot without recording it.
  const restore = useCallback(
    (d: MindMapDoc) => {
      sync(d);
      onChangeRef.current?.(d);
    },
    [sync],
  );
  const undoAction = useCallback(() => {
    const r = undoHistory(historyRef.current, docRef.current);
    if (r) {
      historyRef.current = r.history;
      reportHistory();
      restore(r.value);
    }
  }, [restore, reportHistory]);
  const redoAction = useCallback(() => {
    const r = redoHistory(historyRef.current, docRef.current);
    if (r) {
      historyRef.current = r.history;
      reportHistory();
      restore(r.value);
    }
  }, [restore, reportHistory]);

  // Where a dragged topic would land: the node whose box contains the dragged node's centre (excluding
  // the dragged node + its own subtree), plus WHERE within it — the top quarter inserts the dragged
  // node as a sibling *before* the target, the bottom quarter *after* it, the broad middle nests it as
  // a *child* (the same band rule the outline panel uses, via outlineDropWhere). The root has no parent,
  // so before/after collapses to child there. Single source of truth for the live indicator + the drop.
  const findDropTarget = useCallback(
    (dragId: string, dropPos: { x: number; y: number }) =>
      resolveDropTarget(
        getNodes(),
        dragId,
        subtreeIds(findAnyNode(docRef.current, dragId)),
        dropPos,
        docRef.current.root.id,
      ),
    [getNodes],
  );

  // Live drop-target highlight while dragging (skipped in free-canvas mode, where a drag just moves
  // the node). The exact node this resolves is the one handleDragStop will re-parent under.
  // The dragged box + the other nodes' boxes, for free-canvas alignment snapping. Pulled from the live
  // React Flow nodes (measured sizes), excluding the dragged node.
  const snapFor = useCallback(
    (dragId: string, dragPos: { x: number; y: number }) => {
      const nodes = getNodes();
      const dn = nodes.find((n) => n.id === dragId);
      const w = dn?.measured?.width ?? 0;
      const h = dn?.measured?.height ?? 0;
      const others = nodes
        .filter((n) => n.id !== dragId && n.measured?.width && n.measured?.height)
        .map((n) => ({
          x: n.position.x,
          y: n.position.y,
          w: n.measured?.width ?? 0,
          h: n.measured?.height ?? 0,
        }));
      return computeSnap({ x: dragPos.x, y: dragPos.y, w, h }, others);
    },
    [getNodes],
  );

  const handleDrag = useCallback(
    (dragId: string, dragPos: { x: number; y: number }) => {
      if (docRef.current.meta?.freeform) {
        setDropTargetId(null);
        // A group drag moves the whole selection together (React Flow does the visual move); skip the
        // single-node alignment guides — they'd only track the cursor node, not the group.
        const ids = selectedIdsRef.current;
        if (ids.size > 1 && ids.has(dragId)) {
          setGuides([]);
          return;
        }
        // Preview alignment guides while dragging; the node itself snaps into place on release (below).
        setGuides(snapFor(dragId, dragPos).guides);
        return;
      }
      // Tree mode: highlight a child drop-target ring, or show an insertion line for a sibling reorder.
      const t = findDropTarget(dragId, dragPos);
      if (!t) {
        setDropTargetId(null);
        setInsertEdge(null);
      } else if (t.where === "child") {
        setDropTargetId(t.id);
        setInsertEdge(null);
      } else {
        setDropTargetId(null);
        setInsertEdge({ id: t.id, after: t.where === "after" });
      }
    },
    [findDropTarget, snapFor],
  );

  // Drag a node onto another to re-parent it; an invalid/empty drop snaps it back. In free-canvas
  // mode a drag instead persists the node's new (alignment-snapped) position (no re-parenting).
  const handleDragStop = useCallback(
    (dragId: string, dropPos: { x: number; y: number }) => {
      setDropTargetId(null);
      setInsertEdge(null);
      if (docRef.current.meta?.freeform) {
        setGuides([]);
        // Group drag: the whole selection moved together, so persist EVERY selected node's new
        // position (read live off the React Flow nodes, which onNodesChange kept in step) in one undo
        // step — otherwise only the cursor node would stick and the rest would snap back to layout.
        const ids = selectedIdsRef.current;
        if (ids.size > 1 && ids.has(dragId)) {
          const live = getNodes();
          const positions = [...ids]
            .map((id) => {
              const n = live.find((m) => m.id === id);
              if (!n || findAnyNode(docRef.current, id)?.locked) return null;
              return { id, x: n.position.x, y: n.position.y };
            })
            .filter((p): p is { id: string; x: number; y: number } => p !== null);
          if (positions.length > 0) apply(setNodePositions(docRef.current, positions));
          return;
        }
        // A locked node is draggable:false so this rarely fires, but guard the write anyway.
        if (findAnyNode(docRef.current, dragId)?.locked) return;
        const snap = snapFor(dragId, dropPos);
        apply(setNodePos(docRef.current, dragId, snap.x, snap.y));
        return;
      }
      // Tree mode: nest as a child (centre) or reorder as a sibling before/after the target (edges).
      const t = findDropTarget(dragId, dropPos);
      const r = t ? moveInTree(docRef.current, dragId, t.id, t.where) : { doc: docRef.current };
      if (r.doc !== docRef.current) apply(r);
      else sync(docRef.current); // snap back to the computed layout
    },
    [apply, sync, findDropTarget, snapFor, getNodes],
  );

  // Centre + select a node by id (shared by the imperative handle and the in-map jump links).
  const focusNodeById = useCallback(
    (id: string) => {
      const n = getNodes().find((m) => m.id === id);
      if (!n) return;
      selectOnly(id);
      fireSelect(id);
      const w = n.measured?.width ?? 0;
      const h = n.measured?.height ?? 0;
      setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: 1, duration: 300 });
    },
    [getNodes, fireSelect, setCenter, selectOnly],
  );

  // Editing API for the topic nodes. Commits arrive as raw contenteditable HTML; sanitise to a
  // safe inline subset, derive the plain-text fallback, and store both — topicRich is dropped
  // when the text carries no formatting, so plain topics stay tidy.
  const editingApi = useMemo(() => {
    const parse = (html: string) => {
      const clean = sanitizeRich(html);
      return { rich: hasFormatting(clean) ? clean : undefined, plain: richToPlain(clean) };
    };
    const changed = (n: MapNode | null, rich: string | undefined, plain: string) =>
      !!n && (n.topic !== plain || (n.topicRich ?? undefined) !== rich);
    return {
      editingId,
      seed: editSeed,
      beginEdit: (id: string) => startEdit(id),
      // On-node hover ＋ affordances (#1): add a child/sibling and drop straight into editing it.
      // These never commit the node's own text (no inline-edit in flight), unlike commitAndAdd.
      addChild: (id: string) => apply(addChild(docRef.current, id), true),
      addSibling: (id: string) => apply(addSibling(docRef.current, id), true),
      cancelEdit: () => {
        setEditingId(null);
        setEditSeed(null);
      },
      commitEdit: (id: string, html: string) => {
        setEditingId(null);
        setEditSeed(null);
        const n = id ? findNode(docRef.current, id) : null;
        const { rich, plain } = parse(html);
        if (changed(n, rich, plain)) apply(setTopicRich(docRef.current, id, rich, plain));
      },
      commitAndAdd: (id: string, html: string, what: "sibling" | "child") => {
        let d = docRef.current;
        const n = findNode(d, id);
        const { rich, plain } = parse(html);
        if (changed(n, rich, plain)) d = setTopicRich(d, id, rich, plain).doc;
        apply(what === "child" ? addChild(d, id) : addSibling(d, id), true);
      },
      toggleCollapse: (id: string) => apply(toggleCollapse(docRef.current, id), false, true),
      // Follow a node's hyperlink: jump within the map (#node=), open another map (#map=), or
      // open an external URL in a new tab. Dangerous schemes are refused (the app-wide XSS guard).
      openLink: (url: string) => {
        const link = classifyLink(url);
        if (link.kind === "node") focusNodeById(link.id);
        else if (link.kind === "map") onMapLinkRef.current?.(link.id);
        else if (!isDangerousUrl(link.url)) window.open(link.url, "_blank", "noopener,noreferrer");
      },
      // Click the on-canvas pie to step a leaf task's completion (0→25→50→75→100→0).
      cycleProgress: (id: string) => {
        const n = findNode(docRef.current, id);
        if (n) apply(setProgress(docRef.current, id, nextProgressLevel(n.task?.progress ?? 0)));
      },
      cycleTask: (id: string) => {
        const n = findNode(docRef.current, id);
        if (n) apply(setProgress(docRef.current, id, cycleTaskProgress(n.task?.progress)));
      },
      // Click the on-canvas priority chip to step priority: none → High → Med → Low → none.
      cyclePriority: (id: string) => {
        const n = findNode(docRef.current, id);
        if (n) apply(setPriority(docRef.current, id, cyclePriority(n.task?.priority)));
      },
      // Click the node's 📝 indicator → select it and ask the app to open the Notes tab.
      openNote: (id: string) => {
        selectOnly(id);
        fireSelect(id);
        onOpenNoteRef.current?.();
      },
      // Drop a marker dragged from the palette onto a node — toggles it on that topic.
      dropMarker: (id: string, marker: string) => apply(toggleIcon(docRef.current, id, marker)),
      // Native browser spell-check on the topic editors (view setting; off by default).
      spellcheck,
    };
  }, [editingId, editSeed, startEdit, apply, focusNodeById, selectOnly, fireSelect, spellcheck]);

  // Inline relationship-label editing (double-click a cross-link). Mirrors the topic editing context.
  const linkEditApi = useMemo(
    () => ({
      editingId: editingLinkId,
      commit: (id: string, label: string) => {
        apply(setLinkLabel(docRef.current, id, label.trim()));
        setEditingLinkId(null);
      },
      cancel: () => setEditingLinkId(null),
      // The on-canvas midpoint reshape handle (#1): set this relationship's perpendicular bow.
      setCurve: (id: string, curve: number) => apply(setLinkStyle(docRef.current, id, { curve })),
    }),
    [editingLinkId, apply],
  );

  // Flatten every node's callouts for the overlay, from the live doc (so freshly-added ones show).
  const calloutItems = useMemo<CalloutAnchor[]>(() => {
    const out: CalloutAnchor[] = [];
    const walk = (m: MapNode) => {
      for (const c of m.callouts ?? []) out.push({ nodeId: m.id, callout: c });
      for (const ch of m.children) walk(ch);
    };
    walk(renderDoc.root);
    for (const f of renderDoc.floatingTopics ?? []) walk(f);
    return out;
  }, [renderDoc]);

  // Brace-map fork connectors — only in the brace layout; positions resolve in the overlay.
  const braces = useMemo<BraceGroup[]>(
    () => (direction === "brace" ? computeBraces(renderDoc) : []),
    [direction, renderDoc],
  );

  // Stable array refs for the boundary + summary overlays: the raw `?? []` fallback would mint a new
  // empty array on every render and defeat those components' React.memo. When the doc actually has
  // boundaries/summaries the ref is already stable (same doc → same array), so this only pins the
  // empty-case identity. The overlays are memoised, so a stable ref lets them skip unrelated renders.
  const boundaries = renderDoc.boundaries ?? EMPTY_BOUNDARIES;
  const summaries = renderDoc.summaries ?? EMPTY_SUMMARIES;

  // Empty-state coachmark (#1): when the map is just the bare root (≤1 topic), anchor a one-time
  // hint under it teaching the core add/rename gestures. Hidden once anything is added or edited.
  const showCoach =
    renderDoc.root.children.length === 0 &&
    !(renderDoc.floatingTopics?.length ?? 0) &&
    editingId === null &&
    !coachDismissed;

  // Stable overlay callbacks (deps: the stable `apply`) so the memoised Summaries/Callouts aren't
  // re-rendered by a fresh inline closure every render. Each reads docRef.current for live state.
  const handleRenameSummary = useCallback(
    (sid: string) => {
      const current = (docRef.current.summaries ?? []).find((s) => s.id === sid);
      const next = window.prompt("Summary label (leave empty to remove):", current?.label ?? "");
      if (next === null) return; // cancelled
      apply(
        next.trim()
          ? setSummaryLabel(docRef.current, sid, next)
          : deleteSummary(docRef.current, sid),
      );
    },
    [apply],
  );
  const handleCommitCallout = useCallback(
    (nid: string, cid: string, text: string) =>
      apply(setCalloutText(docRef.current, nid, cid, text)),
    [apply],
  );
  const handleDeleteCallout = useCallback(
    (nid: string, cid: string) => apply(deleteCallout(docRef.current, nid, cid)),
    [apply],
  );

  // Keep node selection flags in sync with the selection set (no re-layout). Drives the highlight
  // for app-side selection changes (click, keyboard, focus); React Flow's own marquee/Ctrl-click
  // round-trips through onSelectionChange, which the equality guard there keeps from looping.
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.selected === selectedIds.has(n.id) ? n : { ...n, selected: selectedIds.has(n.id) },
      ),
    );
  }, [selectedIds, setNodes]);

  // Mirror the selected relationship into the edges' `selected` flag (drives the halo), the same way
  // the node effect above does — so app-side edge selection + the live RF click stay in lockstep.
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) =>
        e.selected === (e.id === selectedEdgeId) ? e : { ...e, selected: e.id === selectedEdgeId },
      ),
    );
  }, [selectedEdgeId, setEdges]);

  // Prune a dangling edge selection: if the selected link is gone (deleted, or pruned with a node, or
  // an undo/redo restored a doc without it), clear it so the inspector doesn't show a stale edge.
  useEffect(() => {
    if (selectedEdgeId && !(renderDoc.links ?? []).some((l) => l.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
      onSelectEdgeRef.current?.(null);
    }
  }, [renderDoc, selectedEdgeId]);

  // Prune a dangling overlay selection: if the selected boundary/summary/callout is gone (deleted, a
  // node pruned its callout, or undo/redo restored a doc without it), clear it.
  useEffect(() => {
    const sel = selectedOverlay;
    if (!sel) return;
    const gone =
      sel.kind === "boundary"
        ? !(renderDoc.boundaries ?? []).some((b) => b.id === sel.id)
        : sel.kind === "summary"
          ? !(renderDoc.summaries ?? []).some((s) => s.id === sel.id)
          : !findAnyNode(renderDoc, sel.nodeId ?? "")?.callouts?.some((c) => c.id === sel.id);
    if (gone) {
      setSelectedOverlay(null);
      onSelectOverlayRef.current?.(null);
    }
  }, [renderDoc, selectedOverlay]);

  // Dismiss the empty-map coachmark permanently once the user enters edit mode by any path
  // (double-click, F2, type-to-edit, or the ＋ affordance) — it never nags again this session.
  useEffect(() => {
    if (editingId) setCoachDismissed(true);
  }, [editingId]);

  // Report the selection count up (the inspector switches to bulk mode when >1).
  const onSelectionCountRef = useLatestRef(onSelectionCount);
  useEffect(() => {
    onSelectionCountRef.current?.(selectedIds.size);
  }, [selectedIds]);

  // Report a per-field "mixed" summary of the selection, so the inspector can blank-out + label a
  // task field the selected topics disagree on (instead of showing the anchor's value). Keyed on the
  // live doc too, so a bulk edit re-fires and collapses "Mixed" → the just-applied uniform value.
  const onSelectionFieldsRef = useLatestRef(onSelectionFields);
  useEffect(() => {
    onSelectionFieldsRef.current?.(selectionFields(renderDoc, selectedIds));
  }, [selectedIds, renderDoc]);

  // Markers/tags-on-all-vs-some summary for tri-state bulk chips. Keyed on the live doc too, so a
  // bulk toggle re-fires and a value flips between "all" and "some" as topics gain/lose it.
  const onSelectionMarkerTagsRef = useLatestRef(onSelectionMarkerTags);
  useEffect(() => {
    onSelectionMarkerTagsRef.current?.({
      markers: selectionMarkers(renderDoc, selectedIds),
      tags: selectionTags(renderDoc, selectedIds),
    });
  }, [selectedIds, renderDoc]);

  // Re-layout on a live layout-kind change (initial mount is already laid out).
  const firstRun = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `direction` is the trigger; sync reads directionRef.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    sync(docRef.current);
    const raf = requestAnimationFrame(() => fitView({ duration: 300 }));
    return () => cancelAnimationFrame(raf);
  }, [direction, sync, fitView]);

  // Re-project + re-layout when auto-numbering is toggled (number prefixes change node widths).
  const firstNumberRun = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `numbered` is the trigger; sync reads numberedRef.
  useEffect(() => {
    if (firstNumberRun.current) {
      firstNumberRun.current = false;
      return;
    }
    sync(docRef.current);
  }, [numbered, sync]);

  // Apply the read-only Power Filter by toggling node/edge opacity in place — no re-layout, since
  // dimming doesn't change sizes. Lit = matches + their ancestors (computed in App); null = off.
  // The "hide" mode instead removes non-lit nodes/edges (React Flow `hidden`); that interacts with the
  // brace-map's own hidden ribbons, so it can't be done in place — a full rebuild gets it right. We
  // also rebuild on the frame hide turns OFF (wasHideRef) so stale `hidden` flags clear cleanly.
  const wasHideRef = useRef(false);
  useEffect(() => {
    if (hideUnmatched || wasHideRef.current) {
      wasHideRef.current = hideUnmatched;
      sync(docRef.current);
      return;
    }
    setNodes((ns) =>
      ns.map((n) => {
        const dimmed = litIds ? !litIds.has(n.id) : false;
        const matched = highlightIds ? highlightIds.has(n.id) : false;
        return Boolean(n.data.dimmed) === dimmed && Boolean(n.data.matched) === matched
          ? n
          : { ...n, data: { ...n.data, dimmed, matched } };
      }),
    );
    setEdges((es) =>
      es.map((e) => {
        const dimmed = litIds ? !(litIds.has(e.source) && litIds.has(e.target)) : false;
        return Boolean(e.data?.dimmed) === dimmed
          ? e
          : { ...e, data: { ...(e.data as EdgeData), dimmed } };
      }),
    );
  }, [litIds, highlightIds, hideUnmatched, sync, setNodes, setEdges]);

  // Reflect the live drag-to-reparent target as a node-data flag so TopicNode rings it (#11). Only
  // the target's `data` changes (the equality guard skips the rest); cleared when the drag ends.
  useEffect(() => {
    setNodes((ns) =>
      ns.map((n) => {
        const isTarget = n.id === dropTargetId;
        return Boolean(n.data.dropTarget) === isTarget
          ? n
          : { ...n, data: { ...n.data, dropTarget: isTarget } };
      }),
    );
  }, [dropTargetId, setNodes]);

  // One-time refine once React Flow has measured the nodes (better sizing than estimates).
  const refined = useRef(false);
  useEffect(() => {
    if (!initialized || refined.current) return;
    refined.current = true;
    sync(docRef.current);
  }, [initialized, sync]);

  // Delete a node and its branch immediately — no blocking "Are you sure?" modal (#9). The delete is
  // a normal undoable edit, and App turns the onDelete report into a "… deleted — Undo" toast wired
  // to undo(), so it's always reversible. Shared by the keyboard Delete, the context menu, and the
  // on-node popover. A no-op (deleting the root / a missing node) reports nothing.
  const deleteNodeWithUndo = useCallback(
    (id: string) => {
      const node = findAnyNode(docRef.current, id);
      const r = deleteNode(docRef.current, id);
      if (r.doc === docRef.current) return; // no-op: root or not found
      apply(r);
      onDeleteRef.current?.(node?.topic?.trim() || "topic", node ? countDescendants(node) : 0);
    },
    [apply],
  );

  // Keyboard tree-building (when a node is selected and we're not inline-editing or in a field). The
  // pure key→intent mapping lives in flow/keyIntent.ts; here we only wire the listener + dispatch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const intent = keyIntent(
        {
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          target: e.target as HTMLElement | null,
        },
        {
          editing: !!editingRef.current,
          selectedId: selectedRef.current,
          linking: !!linkingFromRef.current,
        },
      );
      if (!intent) return;
      // Every intent but the two clears consumes the key.
      if (intent.kind !== "clearLinking" && intent.kind !== "clearDropTarget") e.preventDefault();
      switch (intent.kind) {
        case "clearLinking":
          setLinkingFrom(null);
          break;
        case "clearDropTarget":
          setDropTargetId(null); // clear a stray drag-reparent indicator
          break;
        case "undo":
          undoAction();
          break;
        case "redo":
          redoAction();
          break;
        case "addChild":
          apply(addChild(docRef.current, intent.id), true);
          break;
        case "addSibling":
          apply(addSibling(docRef.current, intent.id), true);
          break;
        case "outdent":
          apply(outdent(docRef.current, intent.id));
          break;
        case "indent":
          apply(indent(docRef.current, intent.id));
          break;
        case "moveUp":
          apply(moveSibling(docRef.current, intent.id, "up"));
          break;
        case "moveDown":
          apply(moveSibling(docRef.current, intent.id, "down"));
          break;
        case "delete":
          deleteNodeWithUndo(intent.id);
          break;
        case "openNote":
          editingApi.openNote(intent.id);
          break;
        case "rename":
          startEdit(intent.id);
          break;
        case "typeEdit":
          startEdit(intent.id, intent.seed);
          break;
        case "selectDir": {
          const next = nextSelectionId(docRef.current, intent.id, intent.dir);
          if (next) focusNodeById(next);
          break;
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [apply, undoAction, redoAction, deleteNodeWithUndo, startEdit, focusNodeById, editingApi]);

  // (The context menu's own outside-pointerdown + Escape close lives in the ContextMenu primitive.)

  const withSelected = useCallback((fn: (id: string) => void): boolean => {
    const id = selectedRef.current;
    if (!id) return false;
    fn(id);
    return true;
  }, []);

  // Fold a pure op over every selected node and commit the result as ONE undo step. Used by the
  // value-setting bulk edits (style / progress / dates / priority) — for a single selection this is
  // identical to the old single-node path (the set is {anchor}). Per-item edits (note / image /
  // hyperlink / attachments / tags / markers) stay on `withSelected` (the anchor only).
  const withSelectedAll = useCallback(
    (op: (doc: MindMapDoc, id: string) => OpResult): boolean => {
      const ids = [...selectedIdsRef.current];
      if (ids.length === 0) return false;
      let doc = docRef.current;
      for (const id of ids) doc = op(doc, id).doc;
      if (doc !== docRef.current) apply({ doc });
      return true;
    },
    [apply],
  );

  // Measured on-canvas node sizes (id → w/h), for align/distribute (centre + right/bottom need widths).
  const measuredSizes = useCallback((): NodeSizes => {
    const out: NodeSizes = {};
    for (const n of getNodes())
      out[n.id] = { w: n.measured?.width ?? 0, h: n.measured?.height ?? 0 };
    return out;
  }, [getNodes]);

  // Apply a pure cross-link op to the selected relationship edge (the edge-inspector path); false if
  // no edge is selected. Mirrors withSelected for nodes.
  const withSelectedLink = useCallback(
    (op: (doc: MindMapDoc, id: string) => OpResult): boolean => {
      const id = selectedEdgeIdRef.current;
      if (!id) return false;
      apply(op(docRef.current, id));
      // Re-resolve the selected edge from the UPDATED doc so the inspector's controls (direction /
      // width / dash / curve highlights) reflect the edit live — the SelectedEdge handed to the app
      // is otherwise captured at selection time and would show stale state after a preset / control.
      // For deleteLink the id no longer resolves → null, which simply clears the inspector.
      fireSelectEdge(id);
      return true;
    },
    [apply, fireSelectEdge],
  );

  // Apply a pure op to the selected overlay (the op picks the right transform by kind); false if none.
  const withSelectedOverlay = useCallback(
    (op: (sel: SelectedOverlay) => OpResult): boolean => {
      const sel = selectedOverlayRef.current;
      if (!sel) return false;
      apply(op(sel));
      return true;
    },
    [apply],
  );

  // Select an overlay (clears node + edge first — mutually exclusive), then resolve + fire.
  const selectOverlay = useCallback(
    (sel: { kind: SelectedOverlay["kind"]; id: string; nodeId?: string }) => {
      setMenu(null);
      setLinkingFrom(null);
      selectOnly(null);
      fireSelect(null);
      clearEdgeSelection();
      fireSelectOverlay(sel);
    },
    [selectOnly, fireSelect, clearEdgeSelection, fireSelectOverlay],
  );
  const handleSelectBoundary = useCallback(
    (id: string) => selectOverlay({ kind: "boundary", id }),
    [selectOverlay],
  );
  const handleSelectSummaryOverlay = useCallback(
    (id: string) => selectOverlay({ kind: "summary", id }),
    [selectOverlay],
  );
  const handleSelectCallout = useCallback(
    (nodeId: string, calloutId: string) =>
      selectOverlay({ kind: "callout", id: calloutId, nodeId }),
    [selectOverlay],
  );

  useImperativeHandle(
    ref,
    (): MindMapHandle => ({
      // Author a clean native-text SVG straight from the model + the live node rects
      // (position + measured size). Flows through useMapExports.cleanSvg() to drive
      // png/svg/html/pdf — and, unlike the old export, carries arrow + boundary labels.
      exportSvg: () => {
        const rects = new Map<string, NodeRect>();
        for (const n of getNodes()) {
          rects.set(n.id, {
            x: n.position.x,
            y: n.position.y,
            w: n.measured?.width ?? 0,
            h: n.measured?.height ?? 0,
          });
        }
        const cssVar = (themeRef.current ?? mindManagerTheme).cssVar;
        const svg = buildFlowSvg(
          docRef.current,
          rects,
          paletteRef.current,
          cssVar,
          numberedRef.current,
          todayISO(),
          directionRef.current === "brace" ? computeBraces(docRef.current) : undefined,
          docRef.current.meta?.freeform ? "freeform" : directionRef.current,
        );
        return new Blob([svg], { type: "image/svg+xml" });
      },
      fit: () => fitView({ duration: 300 }),
      // Snapshot viewport + undo/redo stacks so the tab switcher can restore them on a remount.
      getSession: (): CanvasSession => ({ viewport: getViewport(), history: historyRef.current }),
      getViewport: () => getViewport(),
      setViewport: (vp) => setViewport(vp, { duration: 350 }),
      focusNode: focusNodeById,
      setSelectedImage: (image) => withSelected((id) => apply(setImage(docRef.current, id, image))),
      // Id-based variants for the drag-a-file-onto-a-topic path (the target is the dropped-on node,
      // not necessarily the selected one). Return false if the node no longer exists.
      setNodeImage: (id, image) => {
        if (!findNode(docRef.current, id)) return false;
        apply(setImage(docRef.current, id, image));
        return true;
      },
      addNodeAttachment: (id, attachment) => {
        if (!findNode(docRef.current, id)) return false;
        apply(addAttachment(docRef.current, id, attachment));
        return true;
      },
      setSelectedNote: (note) => withSelected((id) => apply(setNote(docRef.current, id, note))),
      toggleSelectedIcon: (icon) =>
        withSelected((id) => apply(toggleIcon(docRef.current, id, icon))),
      bulkToggleSelectedIcon: (icon) => {
        const ids = [...selectedIdsRef.current];
        if (ids.length === 0) return false;
        apply(bulkToggleIcon(docRef.current, ids, icon));
        return true;
      },
      bulkToggleSelectedTag: (tag) => {
        const ids = [...selectedIdsRef.current];
        if (ids.length === 0) return false;
        apply(bulkToggleTag(docRef.current, ids, tag));
        return true;
      },
      replaceTopics: (query, replacement, scope) => {
        const res = replaceTopics(docRef.current, query, replacement, scope);
        if (res.count > 0) apply({ doc: res.doc });
        return res.count;
      },
      setAllExpanded: (expanded) => apply(setAllExpanded(docRef.current, expanded), false, true),
      setExpandedToLevel: (level) => apply(setExpandedToLevel(docRef.current, level)),
      setNodeSide: (id, side) => apply(setNodeSide(docRef.current, id, side)),
      balanceMap: () => apply(balanceMap(docRef.current)),
      setFreeform: (on) => {
        if (on) {
          // Seed each node's pos from where it currently sits, so the switch is seamless.
          const positions = new Map<string, { x: number; y: number }>();
          for (const n of getNodes()) positions.set(n.id, { x: n.position.x, y: n.position.y });
          apply(setFreeform(docRef.current, true, positions));
        } else {
          apply(setFreeform(docRef.current, false));
        }
      },
      setBackdrop: (kind) => {
        // Add the frame and switch to free-canvas mode so topics drag into its regions (one undo).
        const positions = new Map<string, { x: number; y: number }>();
        for (const n of getNodes()) positions.set(n.id, { x: n.position.x, y: n.position.y });
        const withBackdrop = setBackdrop(docRef.current, kind).doc;
        apply({ doc: setFreeform(withBackdrop, true, positions).doc });
      },
      setBackdropRings: (delta) => apply(setBackdropRings(docRef.current, delta)),
      clearBackdrop: () => apply(clearBackdrop(docRef.current)),
      setSelectedStyle: (patch) => withSelectedAll((doc, id) => mergeStyle(doc, id, patch)),
      copySelectedStyle: () => {
        const id = selectedRef.current;
        return id ? (findAnyNode(docRef.current, id)?.style ?? {}) : null;
      },
      shuffleBranchColors: () => apply(assignBranchColors(docRef.current, paletteRef.current)),
      alignSelection: (mode) =>
        apply(alignNodes(docRef.current, selectedIdsRef.current, mode, measuredSizes())),
      distributeSelection: (axis) =>
        apply(distributeNodes(docRef.current, selectedIdsRef.current, axis, measuredSizes())),
      toggleLocked: (id) => apply(toggleLocked(docRef.current, id)),
      setSelectedHyperlink: (url) =>
        withSelected((id) => apply(setHyperlink(docRef.current, id, url))),
      groupBranch: (id) => {
        apply(groupBranch(docRef.current, id));
        return Boolean(findAnyNode(docRef.current, id));
      },
      groupSelection: () => {
        const ids = [...selectedIdsRef.current];
        if (ids.length < 2) return false;
        apply(groupNodes(docRef.current, ids));
        return true;
      },
      groupSummary: (id) => {
        apply(groupSummary(docRef.current, id));
        return Boolean(findAnyNode(docRef.current, id));
      },
      isolateBranch: (id) => {
        const before = docRef.current;
        apply(isolateBranch(docRef.current, id));
        return docRef.current !== before;
      },
      detachBranch: (id) => {
        const before = docRef.current;
        apply(detachBranch(docRef.current, id));
        return docRef.current !== before;
      },
      renameMap: (title) => apply(setTopic(docRef.current, docRef.current.root.id, title)),
      renameNode: (id, topic) => apply(setTopic(docRef.current, id, topic)),
      indentNode: (id, dir) =>
        apply(dir === "in" ? indent(docRef.current, id) : outdent(docRef.current, id)),
      moveOutlineNode: (dragId, targetId, where) =>
        apply(moveInTree(docRef.current, dragId, targetId, where)),
      setBackground: (color) => apply(setBackground(docRef.current, color)),
      setAccentColor: (color) => apply(setAccentColor(docRef.current, color)),
      setBackgroundImage: (url) => apply(setBackgroundImage(docRef.current, url)),
      setLineJumps: (on) => apply(setLineJumps(docRef.current, on)),
      setConnectorStyle: (style) => apply(setConnectorStyle(docRef.current, style)),
      setBranchGrowth: (growth) => apply(setBranchGrowth(docRef.current, growth)),
      setNumberStyle: (style) => apply(setNumberStyle(docRef.current, style)),
      setFontFamily: (family) => apply(setFontFamily(docRef.current, family)),
      setFontScale: (scale) => apply(setFontScale(docRef.current, scale)),
      setLegend: (on) => apply(setLegend(docRef.current, on)),
      setRules: (rules) => apply(setRules(docRef.current, rules)),
      setSlides: (slides) => apply(setSlides(docRef.current, slides)),
      setSelectedTags: (tags) => withSelected((id) => apply(setTags(docRef.current, id, tags))),
      renameTag: (from, to) => apply(renameTag(docRef.current, from, to)),
      deleteTag: (tag) => apply(deleteTag(docRef.current, tag)),
      setSelectedProgress: (progress) =>
        withSelectedAll((doc, id) => setProgress(doc, id, progress)),
      setSelectedDue: (due) => withSelectedAll((doc, id) => setDue(doc, id, due)),
      setSelectedStart: (start) => withSelectedAll((doc, id) => setStart(doc, id, start)),
      setSelectedPriority: (priority) =>
        withSelectedAll((doc, id) => setPriority(doc, id, priority)),
      addSelectedAttachment: (attachment) =>
        withSelected((id) => apply(addAttachment(docRef.current, id, attachment))),
      removeSelectedAttachment: (index) =>
        withSelected((id) => apply(removeAttachment(docRef.current, id, index))),
      addSubtreeToSelected: (nodes) =>
        withSelected((id) => apply(addSubtree(docRef.current, id, nodes))),
      addStickyNote: () => apply(addStickyNote(docRef.current)),
      setSelectedRollup: (mapId) =>
        withSelected((id) => apply(setRollup(docRef.current, id, mapId || undefined))),
      quickAdd: (text) => {
        const t = text.trim();
        if (!t) return;
        const parentId = selectedRef.current ?? docRef.current.root.id;
        // Apply without a selectId so the parent stays selected — rapid entry adds siblings.
        const res = addSubtree(docRef.current, parentId, [{ id: "q", topic: t, children: [] }]);
        apply({ doc: res.doc });
      },
      addChildToSelected: () => withSelected((id) => apply(addChild(docRef.current, id), true)),
      deleteSelected: () => withSelected((id) => deleteNodeWithUndo(id)),
      undo: undoAction,
      redo: redoAction,
      // Relationship (cross-link) edits — applied to the selected edge (false if none selected).
      setLinkLabel: (label) => withSelectedLink((doc, id) => setLinkLabel(doc, id, label)),
      setLinkArrow: (arrow) => withSelectedLink((doc, id) => setLinkArrow(doc, id, arrow)),
      setLinkStyle: (patch) => withSelectedLink((doc, id) => setLinkStyle(doc, id, patch)),
      deleteLink: () => {
        const ok = withSelectedLink((doc, id) => deleteLink(doc, id));
        if (ok) {
          setSelectedEdgeId(null);
          onSelectEdgeRef.current?.(null);
        }
        return ok;
      },
      // Overlay (boundary / summary / callout) edits — applied to the selected overlay by kind.
      setOverlayLabel: (label) =>
        withSelectedOverlay((sel) => OVERLAY_OPS[sel.kind].label(docRef.current, sel, label)),
      setOverlayColor: (color) => {
        const sel = selectedOverlayRef.current;
        const ok = withSelectedOverlay((s) => OVERLAY_OPS[s.kind].color(docRef.current, s, color));
        // Re-emit the (unchanged) selection so the inspector's swatch reflects the new colour.
        if (ok && sel) fireSelectOverlay({ kind: sel.kind, id: sel.id, nodeId: sel.nodeId });
        return ok;
      },
      setOverlayShape: (shape) => {
        const sel = selectedOverlayRef.current;
        if (sel?.kind !== "boundary") return false;
        const ok = withSelectedOverlay((s) => setBoundaryShape(docRef.current, s.id, shape));
        if (ok) fireSelectOverlay({ kind: sel.kind, id: sel.id, nodeId: sel.nodeId });
        return ok;
      },
      setOverlayDash: (dash) => {
        const sel = selectedOverlayRef.current;
        if (sel?.kind !== "boundary") return false;
        const ok = withSelectedOverlay((s) => setBoundaryDash(docRef.current, s.id, dash));
        if (ok) fireSelectOverlay({ kind: sel.kind, id: sel.id, nodeId: sel.nodeId });
        return ok;
      },
      deleteOverlay: () => {
        const ok = withSelectedOverlay((sel) => OVERLAY_OPS[sel.kind].del(docRef.current, sel));
        if (ok) clearOverlaySelection();
        return ok;
      },
      setBackdropColor: (color) => apply(setBackdropColor(docRef.current, color)),
    }),
    [
      fitView,
      getNodes,
      getViewport,
      setViewport,
      apply,
      withSelected,
      withSelectedAll,
      withSelectedLink,
      withSelectedOverlay,
      measuredSizes,
      clearOverlaySelection,
      fireSelectOverlay,
      focusNodeById,
      deleteNodeWithUndo,
      undoAction,
      redoAction,
    ],
  );

  return (
    <EditingContext.Provider value={editingApi}>
      <LinkEditContext.Provider value={linkEditApi}>
        <div
          style={{
            height: "100%",
            width: "100%",
            ...themeVars(theme),
            // Per-map background overrides the theme's canvas colour (reads the live mirror).
            ...(renderDoc.meta?.background ? { background: renderDoc.meta.background } : {}),
          }}
          // Drop a link (or text) from the browser onto the canvas → a new floating topic.
          onDragOver={(e) => {
            if (
              e.dataTransfer.types.includes("Files") ||
              e.dataTransfer.types.includes("text/uri-list") ||
              e.dataTransfer.types.includes("text/plain")
            ) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={(e) => {
            // Desktop files dropped onto a topic → attach to that topic (image = its picture, anything
            // else = an attachment). Resolve the drop target by hit-testing the flow-space point against
            // the live node boxes; ignore file drops that miss every node.
            const files = Array.from(e.dataTransfer.files ?? []);
            if (files.length > 0) {
              e.preventDefault();
              const p = screenToFlowPosition({ x: e.clientX, y: e.clientY });
              const id = nodeAtPoint(getNodes(), p.x, p.y);
              if (id) onDropFilesOnNodeRef.current?.(id, files);
              return;
            }
            const raw = (
              e.dataTransfer.getData("text/uri-list") ||
              e.dataTransfer.getData("text/plain") ||
              ""
            ).trim();
            const first = raw.split(/\r?\n/).find((l) => l && !l.startsWith("#")) ?? "";
            if (!first) return;
            e.preventDefault();
            let topic = first;
            let link: string | undefined;
            if (/^https?:\/\//i.test(first) && !isDangerousUrl(first)) {
              link = first;
              try {
                topic = new URL(first).hostname.replace(/^www\./, "") || first;
              } catch {
                topic = first;
              }
            }
            apply(addFloatingTopic(docRef.current, topic, link));
          }}
          // Double-click the empty canvas to drop a new floating topic and edit it straight away (#6).
          // Node double-clicks stopPropagation (→ inline edit), so only bare-pane double-clicks reach
          // here; the target guard keeps clicks on the controls / minimap from creating stray topics.
          onDoubleClick={(e) => {
            if ((e.target as HTMLElement)?.classList?.contains("react-flow__pane")) {
              apply(addFloatingTopic(docRef.current, ""), true);
            }
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable
            // Drag-to-relate: pulling from a topic's hover handle onto another topic draws a cross-link
            // (loose mode lets the drag end anywhere on the target node, not just its anchor handle).
            nodesConnectable
            connectionMode={ConnectionMode.Loose}
            onConnect={(c) => {
              if (c.source && c.target && c.source !== c.target) {
                apply(addLink(docRef.current, c.source, c.target));
              }
            }}
            deleteKeyCode={null}
            zoomOnDoubleClick={false}
            colorMode={(theme ?? mindManagerTheme).type}
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
            maxZoom={3}
            // Restore a saved viewport (lossless tab switch) when present; else fit to view on mount.
            // Read from the mount-captured session so a later re-render (after App clears the one-shot
            // cache) can't flip fitView back on and re-fit away the restored viewport.
            fitView={!mountSession.current?.viewport}
            defaultViewport={mountSession.current?.viewport}
            // Left-drag the background to pan (the gesture most people reach for first); the +/−/fit
            // controls stay too. Scroll / ⌘-scroll zooms (React Flow's defaults). Hold Shift and drag
            // to rubber-band a marquee selection; Shift/Ctrl/Cmd-click extends the selection. (#6)
            panOnDrag
            selectionKeyCode="Shift"
            multiSelectionKeyCode={["Shift", "Meta", "Control"]}
            onSelectionChange={onSelectionChange}
            onNodeClick={(ev, node) => {
              // In "Link to…" mode, the next click on a *different* node completes the relationship.
              if (linkingFrom && node.id !== linkingFrom) {
                const label = window.prompt("Relationship label (optional):", "") ?? "";
                apply(addLink(docRef.current, linkingFrom, node.id, label));
                setLinkingFrom(null);
                return;
              }
              setLinkingFrom(null);
              setMenu(null);
              clearEdgeSelection();
              clearOverlaySelection();
              // A modified click extends the selection — React Flow toggles it and we mirror the
              // result via onSelectionChange; a plain click is a single (anchor) select.
              if (ev.shiftKey || ev.metaKey || ev.ctrlKey) return;
              selectOnly(node.id);
              fireSelect(node.id);
            }}
            onEdgeClick={(_, edge) => {
              // Selecting a relationship opens the EdgeInspector; clear node + overlay (mutually
              // exclusive), and the menu / link-draw gesture.
              if (edge.type !== "crosslink") return;
              setMenu(null);
              setLinkingFrom(null);
              selectOnly(null);
              fireSelect(null);
              clearOverlaySelection();
              setSelectedEdgeId(edge.id);
              fireSelectEdge(edge.id);
            }}
            onEdgeDoubleClick={(_, edge) => {
              // Inline-edit a relationship's label right on the canvas (double-click the line).
              if (edge.type === "crosslink") setEditingLinkId(edge.id);
            }}
            onPaneClick={() => {
              setLinkingFrom(null);
              selectOnly(null);
              fireSelect(null);
              clearEdgeSelection();
              clearOverlaySelection();
              setMenu(null);
            }}
            onNodeContextMenu={(e, node) => {
              e.preventDefault();
              clearEdgeSelection();
              clearOverlaySelection();
              selectOnly(node.id);
              fireSelect(node.id);
              setMenu({ x: e.clientX, y: e.clientY, id: node.id });
            }}
            onNodeDrag={(_, node) => handleDrag(node.id, node.position)}
            onNodeDragStop={(_, node) => handleDragStop(node.id, node.position)}
            onEdgeContextMenu={(e, edge) => {
              e.preventDefault();
              if (edge.type !== "crosslink") return;
              if (window.confirm("Delete this relationship?"))
                apply(deleteLink(docRef.current, edge.id));
            }}
          >
            <BackgroundImage url={renderDoc.meta?.backgroundImage} />
            <DiagramBackdrop backdrop={renderDoc.backdrop} />
            <BraceConnectors braces={braces} />
            <Boundaries
              boundaries={boundaries}
              selectedId={selectedOverlay?.kind === "boundary" ? selectedOverlay.id : null}
              onSelect={handleSelectBoundary}
              accent={renderDoc.meta?.accentColor}
            />
            <Summaries
              summaries={summaries}
              onRename={handleRenameSummary}
              selectedId={selectedOverlay?.kind === "summary" ? selectedOverlay.id : null}
              onSelect={handleSelectSummaryOverlay}
            />
            <Callouts
              items={calloutItems}
              onCommit={handleCommitCallout}
              onDelete={handleDeleteCallout}
              selectedId={selectedOverlay?.kind === "callout" ? selectedOverlay.id : null}
              onSelect={handleSelectCallout}
            />
            <NodePopover
              selectedId={selectedId}
              editingId={editingId}
              doc={renderDoc}
              onRename={startEdit}
              onToggleCollapse={(id) => apply(toggleCollapse(docRef.current, id))}
              onDelete={deleteNodeWithUndo}
            />
            <CoachMark show={showCoach} rootId={renderDoc.root.id} />
            <DropLabel dropTargetId={dropTargetId} doc={renderDoc} />
            {/* Sibling-reorder insertion line (#8): a bar at the target node's top/bottom edge. */}
            {insertEdge
              ? (() => {
                  const n = nodes.find((m) => m.id === insertEdge.id);
                  if (!n) return null;
                  const w = n.measured?.width ?? 0;
                  const h = n.measured?.height ?? 0;
                  const y = insertEdge.after ? n.position.y + h : n.position.y;
                  return (
                    <ViewportPortal>
                      <div
                        style={{
                          position: "absolute",
                          left: n.position.x - 4,
                          top: y - 1.5,
                          width: w + 8,
                          height: 3,
                          background: "#1b8a5e",
                          borderRadius: 2,
                          boxShadow: "0 0 0 1px rgba(255,255,255,0.7)",
                          pointerEvents: "none",
                          zIndex: 5,
                        }}
                      />
                    </ViewportPortal>
                  );
                })()
              : null}
            {renderDoc.meta?.legend ? <LegendPanel doc={renderDoc} /> : null}
            {guides.length > 0 ? (
              <ViewportPortal>
                {guides.map((g, i) => (
                  <div
                    key={`${g.axis}:${g.pos}:${i}`}
                    style={{
                      position: "absolute",
                      background: "#f5a623",
                      pointerEvents: "none",
                      ...(g.axis === "x"
                        ? { left: g.pos, top: g.start, width: 1, height: g.end - g.start }
                        : { left: g.start, top: g.pos, height: 1, width: g.end - g.start }),
                    }}
                  />
                ))}
              </ViewportPortal>
            ) : null}
            <Controls showInteractive={false} />
            <StatusBar topics={nodes.length} selected={selectedIds.size} />
            <MinimapPanel open={minimapOpen} onToggle={toggleMinimap} />
          </ReactFlow>
          {menu ? (
            <ContextMenu
              x={menu.x}
              y={menu.y}
              onClose={() => setMenu(null)}
              menuAriaLabel="Topic actions"
              sheet={isMobile}
            >
              {(() => {
                const id = menu.id;
                const items: [string, () => void, boolean?][] = [
                  ["Add child", () => apply(addChild(docRef.current, id), true)],
                  ["Add sibling", () => apply(addSibling(docRef.current, id), true)],
                  ["Rename", () => startEdit(id)],
                  [
                    "Add note",
                    () => {
                      selectOnly(id);
                      fireSelect(id);
                      onOpenNoteRef.current?.();
                    },
                  ],
                  ["Link to…", () => setLinkingFrom(id)],
                  ["Add callout", () => apply(addCallout(docRef.current, id))],
                  ["Group in boundary", () => apply(groupBranch(docRef.current, id))],
                  ["Summarize branch", () => apply(groupSummary(docRef.current, id))],
                  [
                    "Copy branch",
                    () => {
                      const n = findAnyNode(docRef.current, id);
                      if (n) setBranch(structuredClone(n));
                    },
                  ],
                ];
                // Cross-map paste: show only when the branch clipboard has something (it persists in
                // localStorage, so a branch copied in another map shows up here too).
                const clip = getBranch();
                if (clip)
                  items.push([
                    "Paste branch here",
                    () => apply(pasteBranch(docRef.current, id, clip)),
                  ]);
                items.push(["Collapse / expand", () => apply(toggleCollapse(docRef.current, id))]);
                items.push([
                  findAnyNode(docRef.current, id)?.locked ? "Unlock position" : "Lock position",
                  () => apply(toggleLocked(docRef.current, id)),
                ]);
                // Detach a central-tree branch out to a floating topic; re-attach a floating one to
                // the centre. (Either way you can also just drag it.)
                const isFloatingTop = (docRef.current.floatingTopics ?? []).some(
                  (f) => f.id === id,
                );
                if (isFloatingTop)
                  items.push([
                    "Re-attach to centre",
                    () => apply(reparent(docRef.current, id, docRef.current.root.id)),
                  ]);
                else if (id !== docRef.current.root.id)
                  items.push([
                    "Detach to floating topic",
                    () => apply(detachBranch(docRef.current, id)),
                  ]);
                items.push(["Delete", () => deleteNodeWithUndo(id), true]);
                // Live marker/priority state so the quick-setters reflect the node (and toggle off).
                const node = findAnyNode(docRef.current, id);
                const activeMarkers = node?.icons ?? [];
                const curPriority = node?.task?.priority;
                return (
                  <>
                    {items.map(([label, fn, danger]) => (
                      <MenuItem
                        key={label}
                        label={label}
                        danger={danger}
                        shortcut={MENU_SHORTCUT[label]}
                        onSelect={fn}
                      />
                    ))}
                    <MenuSeparator />
                    {/* Inline marker quick-setter (the "Set marker" submenu): toggle several without
                      closing, mirroring the inspector's MarkerBar but reachable in one right-click. */}
                    <MenuLabel>Markers</MenuLabel>
                    <div className="mm-menu-row">
                      {MARKER_PALETTE.map((m) => {
                        const on = activeMarkers.includes(m);
                        return (
                          <button
                            key={m}
                            type="button"
                            className="mm-menu-chip"
                            aria-pressed={on}
                            aria-label={`${on ? "Remove" : "Add"} marker ${m}`}
                            data-on={on || undefined}
                            onClick={() => apply(toggleIcon(docRef.current, id, m))}
                          >
                            {markerImage(m) ? (
                              <img src={markerImage(m) as string} alt={m} width={16} height={16} />
                            ) : (
                              m
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {/* Inline priority quick-setter (the "Set priority" submenu). */}
                    <MenuLabel>Priority</MenuLabel>
                    <div className="mm-menu-row">
                      {PRIORITY_LEVELS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className="mm-menu-chip"
                          aria-pressed={curPriority === p}
                          data-on={curPriority === p || undefined}
                          onClick={() =>
                            apply(
                              setPriority(docRef.current, id, curPriority === p ? undefined : p),
                            )
                          }
                        >
                          {PRIORITY_LABEL[p]}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="mm-menu-chip"
                        aria-pressed={!curPriority}
                        data-on={!curPriority || undefined}
                        onClick={() => apply(setPriority(docRef.current, id, undefined))}
                      >
                        None
                      </button>
                    </div>
                    <MenuSeparator />
                    <label
                      className="mm-menu-label"
                      style={{ display: "block", textTransform: "none", letterSpacing: 0 }}
                    >
                      Branch layout
                      <select
                        className="mm-select"
                        defaultValue={findNode(docRef.current, menu.id)?.layout ?? ""}
                        onChange={(e) => {
                          apply(
                            setNodeLayout(docRef.current, menu.id, e.target.value || undefined),
                          );
                          setMenu(null);
                        }}
                        style={{ width: "100%", marginTop: 4 }}
                      >
                        <option value="">Default (map)</option>
                        <option value="org-down">Org chart ↓</option>
                        <option value="org-up">Org chart ↑</option>
                        <option value="right">Right</option>
                        <option value="left">Left</option>
                        <option value="radial">Radial</option>
                        <option value="timeline">Timeline</option>
                        <option value="fishbone">Fishbone</option>
                        <option value="grid">Grid</option>
                        <option value="brace">Brace</option>
                      </select>
                    </label>
                    {/* Map side — pin a main branch to a half of the two-sided map (else auto-balance).
                      Only meaningful for a root child in the "side" layout. */}
                    {direction === "side" &&
                    !renderDoc.meta?.freeform &&
                    renderDoc.root.children.some((c) => c.id === menu.id) ? (
                      <label
                        className="mm-menu-label"
                        style={{ display: "block", textTransform: "none", letterSpacing: 0 }}
                      >
                        Map side
                        <select
                          className="mm-select"
                          defaultValue={findNode(docRef.current, menu.id)?.side ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            apply(
                              setNodeSide(
                                docRef.current,
                                menu.id,
                                v === "left" || v === "right" ? v : undefined,
                              ),
                            );
                            setMenu(null);
                          }}
                          style={{ width: "100%", marginTop: 4 }}
                        >
                          <option value="">Auto (balance)</option>
                          <option value="left">Left side</option>
                          <option value="right">Right side</option>
                        </select>
                      </label>
                    ) : null}
                    <MenuLabel>Branch colour</MenuLabel>
                    <div className="mm-menu-row">
                      {["#c2701a", "#3f6fb0", "#1b8a5e", "#b23b6a", "#8a6d2f", "#6a5acd"].map(
                        (c) => {
                          const on = findNode(docRef.current, id)?.branchColor === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              className="mm-menu-chip"
                              aria-label={`Branch colour ${c}`}
                              aria-pressed={on}
                              data-on={on || undefined}
                              onClick={() => apply(setBranchColor(docRef.current, id, on ? "" : c))}
                              style={{ background: c, width: 18, height: 18, padding: 0 }}
                            />
                          );
                        },
                      )}
                      <button
                        type="button"
                        className="mm-menu-chip"
                        onClick={() => apply(setBranchColor(docRef.current, id, ""))}
                      >
                        Default
                      </button>
                    </div>
                    <MenuLabel>Branch line</MenuLabel>
                    <div className="mm-menu-row">
                      {(["solid", "dashed", "dotted"] as const).map((d) => {
                        const on = (findNode(docRef.current, id)?.lineDash ?? "solid") === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            className="mm-menu-chip"
                            aria-pressed={on}
                            data-on={on || undefined}
                            onClick={() => apply(setLineDash(docRef.current, id, d))}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </ContextMenu>
          ) : null}
          {linkingFrom ? (
            <div
              style={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                padding: "5px 12px",
                background: `var(--mm-root-bg, ${colors.menu.linkBg})`,
                color: `var(--mm-root-color, ${colors.menu.linkColor})`,
                borderRadius: 8,
                font: "13px system-ui, sans-serif",
                boxShadow: "0 2px 10px #0004",
                pointerEvents: "none",
              }}
            >
              Click a target node to draw a relationship · Esc to cancel
            </div>
          ) : null}
        </div>
      </LinkEditContext.Provider>
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
