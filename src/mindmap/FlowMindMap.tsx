import "@xyflow/react/dist/style.css";
import {
  Background,
  Controls,
  MiniMap,
  NodeToolbar,
  Panel,
  Position,
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
import { EditorIcon, type EditorIconName } from "../components/EditorIcons";
import { ContextMenu, MenuItem, MenuSeparator } from "../design/primitives";
import { colors } from "../design/tokens";
import { hasFormatting, richToPlain, sanitizeRich } from "../io/richText";
import { isDangerousUrl } from "../io/urlSafety";
import type { Boundary, MapNode, MindMapDoc, Summary } from "../model/types";
import { nextProgressLevel } from "../progress";
import { getBranch, setBranch } from "../store/branchClipboard";
import { todayISO } from "../taskDate";
import { useIsMobile } from "../useIsMobile";
import {
  type LayoutKind,
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
import { CrosslinkEdge } from "./flow/CrosslinkEdge";
import { DiagramBackdrop } from "./flow/DiagramBackdrop";
import { Summaries } from "./flow/Summaries";
import { TopicNode } from "./flow/TopicNode";
import { type BraceGroup, computeBraces } from "./flow/brace";
import { EditingContext } from "./flow/editing";
import { type NodeRect, buildFlowSvg } from "./flow/exportSvg";
import { createHistory, record, redo as redoHistory, undo as undoHistory } from "./flow/history";
import { computeLayout, estimateSizeOf } from "./flow/layout";
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
  bulkToggleIcon,
  bulkToggleTag,
  clearBackdrop,
  deleteBoundary,
  deleteCallout,
  deleteLink,
  deleteNode,
  deleteSummary,
  findAnyNode,
  findNode,
  groupBranch,
  groupSummary,
  mergeStyle,
  outdent,
  pasteBranch,
  removeAttachment,
  reparent,
  replaceTopics,
  selectionFields,
  selectionMarkers,
  selectionTags,
  setAllExpanded,
  setBackdrop,
  setBackdropColor,
  setBackdropRings,
  setBackground,
  setBackgroundImage,
  setBoundaryColor,
  setBoundaryLabel,
  setCalloutColor,
  setCalloutText,
  setDue,
  setFreeform,
  setHyperlink,
  setImage,
  setLineJumps,
  setLinkArrow,
  setLinkLabel,
  setLinkStyle,
  setNodeLayout,
  setNodePos,
  setNote,
  setPriority,
  setProgress,
  setRollup,
  setRules,
  setStart,
  setSummaryColor,
  setSummaryLabel,
  setTags,
  setTopic,
  setTopicRich,
  toggleCollapse,
  toggleIcon,
} from "./flow/ops";
import { project } from "./flow/project";
import { CROSSLINK_COLOR, CROSSLINK_WIDTH } from "./flow/style";
import type { EdgeData, FlowEdge, TopicNode as TopicNodeT } from "./flow/types";
import { mindManagerTheme } from "./theme";

// React Flow canvas — a fully editable engine. Inline topic editing (double-click / F2),
// keyboard tree-building (Enter/Tab/Shift+Tab/Delete), drag-to-reparent, a right-click context
// menu, undo/redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, doc-snapshot stack), theming via CSS vars,
// SVG export (native <text>, authored from the model + live node rects), and the model-mutating
// MindMapHandle methods. Every edit is a pure op on the canonical doc → re-project → re-layout →
// onChange, so the model is the single source of truth.

const nodeTypes = { topic: TopicNode };
const edgeTypes = { branch: BranchEdge, crosslink: CrosslinkEdge };

// Shared empty arrays so the boundary/summary overlays get a stable prop ref when the doc has none
// (a fresh `[]` each render would defeat their React.memo). Frozen to flag them as never-mutated.
const EMPTY_BOUNDARIES: readonly Boundary[] = Object.freeze([]);
const EMPTY_SUMMARIES: readonly Summary[] = Object.freeze([]);

/** Count all descendants of a node (the size of the branch beneath it) — drives the delete confirm. */
function countDescendants(n: MapNode): number {
  let total = 0;
  for (const k of n.children) total += 1 + countDescendants(k);
  return total;
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

/** One button in the inline node popover (the on-selection quick-action toolbar). */
function PopBtn({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: EditorIconName;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="nodrag nopan"
      title={label}
      aria-label={label}
      onClick={onClick}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: danger ? "#b23b3a" : colors.muted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <EditorIcon name={icon} size={16} />
    </button>
  );
}

function FlowInner({
  doc,
  theme,
  direction = "side",
  numbered = false,
  litIds = null,
  onChange,
  onSelect,
  onSelectionCount,
  onSelectionFields,
  onSelectionMarkerTags,
  onSelectEdge,
  onSelectOverlay,
  onOpenNote,
  onMapLink,
  ref,
}: MindMapProps) {
  const palette = (theme ?? mindManagerTheme).palette;
  const isMobile = useIsMobile();
  const projected = useMemo(() => project(doc, palette, numbered), [doc, palette, numbered]);
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
  const { fitView, getNodes, setCenter } = useReactFlow();
  const initialized = useNodesInitialized();

  // Refs so the stable callbacks below always read the latest values.
  const docRef = useRef(doc);
  const historyRef = useRef(createHistory<MindMapDoc>());
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  const directionRef = useRef<LayoutKind>(direction);
  directionRef.current = direction;
  const numberedRef = useRef(numbered);
  numberedRef.current = numbered;
  const litIdsRef = useRef(litIds);
  litIdsRef.current = litIds;
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const selectedIdsRef = useRef<Set<string>>(selectedIds);
  selectedIdsRef.current = selectedIds;
  const selectedEdgeIdRef = useRef<string | null>(null);
  selectedEdgeIdRef.current = selectedEdgeId;
  const onSelectEdgeRef = useRef(onSelectEdge);
  onSelectEdgeRef.current = onSelectEdge;
  const selectedOverlayRef = useRef<SelectedOverlay | null>(null);
  selectedOverlayRef.current = selectedOverlay;
  const onSelectOverlayRef = useRef(onSelectOverlay);
  onSelectOverlayRef.current = onSelectOverlay;
  const editingRef = useRef<string | null>(null);
  editingRef.current = editingId;
  const linkingFromRef = useRef<string | null>(null);
  linkingFromRef.current = linkingFrom;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onMapLinkRef = useRef(onMapLink);
  onMapLinkRef.current = onMapLink;
  const onOpenNoteRef = useRef(onOpenNote);
  onOpenNoteRef.current = onOpenNote;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Re-project + re-layout from a doc (with measured sizes when available, else estimated).
  const sync = useCallback(
    (newDoc: MindMapDoc, nextSelected?: string | null) => {
      docRef.current = newDoc;
      setRenderDoc(newDoc);
      // A structural op passes its result node as the next anchor → selection collapses to it. A
      // bulk edit passes nothing → the multi-selection set is preserved across the re-render.
      if (nextSelected !== undefined) {
        selectedRef.current = nextSelected;
        selectedIdsRef.current = nextSelected ? new Set([nextSelected]) : new Set();
      }
      const proj = project(newDoc, paletteRef.current, numberedRef.current);
      const est = estimateSizeOf(proj.nodes);
      const measured = getNodes();
      const sizeOf = (id: string) => {
        const m = measured.find((n) => n.id === id);
        return m?.measured?.width && m?.measured?.height
          ? { width: m.measured.width, height: m.measured.height }
          : est(id);
      };
      // Free-canvas mode overrides the picked layout: nodes sit at their own `pos`.
      const kind = newDoc.meta?.freeform ? "freeform" : directionRef.current;
      const pos = computeLayout(proj.nodes, proj.edges, sizeOf, kind);
      const selIds = selectedIdsRef.current;
      const lit = litIdsRef.current;
      setNodes(
        proj.nodes.map((n) => ({
          ...n,
          position: pos.get(n.id) ?? { x: 0, y: 0 },
          selected: selIds.has(n.id),
          data: lit ? { ...n.data, dimmed: !lit.has(n.id) } : n.data,
        })),
      );
      // Brace map hides the tapered branch ribbons (the "{" forks replace them); cross-links stay.
      const brace = kind === "brace";
      const selEdge = selectedEdgeIdRef.current;
      setEdges(
        proj.edges.map((e) => ({
          ...e,
          // Persist the selected relationship's halo across re-projection (mirrors the node path).
          selected: e.id === selEdge,
          ...(brace && !e.data?.crosslink ? { hidden: true } : {}),
          data: lit
            ? { ...(e.data as EdgeData), dimmed: !(lit.has(e.source) && lit.has(e.target)) }
            : e.data,
        })),
      );
    },
    [getNodes, setNodes, setEdges],
  );

  const fireSelect = useCallback((id: string | null) => {
    const n = id ? findNode(docRef.current, id) : null;
    onSelectRef.current?.(n ? { id: n.id, topic: n.topic, note: n.note ?? "" } : null);
  }, []);

  // Emit the selected relationship (resolved, defaults filled) to the app's EdgeInspector, or null.
  const fireSelectEdge = useCallback((id: string | null) => {
    const l = id ? (docRef.current.links ?? []).find((x) => x.id === id) : null;
    onSelectEdgeRef.current?.(
      l
        ? {
            id: l.id,
            label: l.label ?? "",
            arrow: l.arrow ?? "to",
            color: l.color ?? CROSSLINK_COLOR,
            width: l.width ?? CROSSLINK_WIDTH,
            dash: l.dash ?? "dashed",
          }
        : null,
    );
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
  const fireSelectOverlay = useCallback(
    (sel: { kind: SelectedOverlay["kind"]; id: string; nodeId?: string } | null) => {
      if (!sel) {
        setSelectedOverlay(null);
        onSelectOverlayRef.current?.(null);
        return;
      }
      const doc = docRef.current;
      let label: string | undefined;
      let color: string | undefined;
      if (sel.kind === "boundary") {
        const b = (doc.boundaries ?? []).find((x) => x.id === sel.id);
        label = b?.label;
        color = b?.color;
      } else if (sel.kind === "summary") {
        const s = (doc.summaries ?? []).find((x) => x.id === sel.id);
        label = s?.label;
        color = s?.color;
      } else {
        const node = sel.nodeId ? findAnyNode(doc, sel.nodeId) : null;
        const found = node?.callouts?.find((c) => c.id === sel.id);
        if (!found) return; // callout gone
        label = found.text;
        color = found.color;
      }
      // boundary/summary may legitimately have no label; only bail if the object itself is missing.
      if (sel.kind !== "callout") {
        const exists =
          sel.kind === "boundary"
            ? (doc.boundaries ?? []).some((b) => b.id === sel.id)
            : (doc.summaries ?? []).some((s) => s.id === sel.id);
        if (!exists) return;
      }
      const resolved: SelectedOverlay = {
        kind: sel.kind,
        id: sel.id,
        nodeId: sel.nodeId,
        label: label ?? "",
        deletable: true,
        color,
      };
      setSelectedOverlay(resolved);
      onSelectOverlayRef.current?.(resolved);
    },
    [],
  );

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

  // Apply a pure op: persist + re-render; optionally enter edit on the resulting node.
  const apply = useCallback(
    (result: OpResult, edit = false) => {
      if (result.doc !== docRef.current) {
        historyRef.current = record(historyRef.current, docRef.current); // snapshot the old doc
        sync(result.doc, result.selectId);
        onChangeRef.current?.(result.doc);
      }
      if (result.selectId !== undefined) {
        selectOnly(result.selectId);
        fireSelect(result.selectId);
        if (edit) setEditingId(result.selectId);
      }
    },
    [sync, fireSelect, selectOnly],
  );

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
      restore(r.value);
    }
  }, [restore]);
  const redoAction = useCallback(() => {
    const r = redoHistory(historyRef.current, docRef.current);
    if (r) {
      historyRef.current = r.history;
      restore(r.value);
    }
  }, [restore]);

  // Drag a node onto another to re-parent it; an invalid/empty drop snaps it back. In free-canvas
  // mode a drag instead persists the node's new position (no re-parenting).
  const handleDragStop = useCallback(
    (dragId: string, dropPos: { x: number; y: number }) => {
      if (docRef.current.meta?.freeform) {
        apply(setNodePos(docRef.current, dragId, dropPos.x, dropPos.y));
        return;
      }
      const all = getNodes();
      const dragged = all.find((n) => n.id === dragId);
      const cx = dropPos.x + (dragged?.measured?.width ?? 0) / 2;
      const cy = dropPos.y + (dragged?.measured?.height ?? 0) / 2;
      const target = all.find((n) => {
        if (n.id === dragId) return false;
        const w = n.measured?.width ?? 0;
        const h = n.measured?.height ?? 0;
        return (
          cx >= n.position.x &&
          cx <= n.position.x + w &&
          cy >= n.position.y &&
          cy <= n.position.y + h
        );
      });
      const r = target ? reparent(docRef.current, dragId, target.id) : { doc: docRef.current };
      if (r.doc !== docRef.current) apply(r);
      else sync(docRef.current); // snap back to the computed layout
    },
    [getNodes, apply, sync],
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
      beginEdit: (id: string) => setEditingId(id),
      cancelEdit: () => setEditingId(null),
      commitEdit: (id: string, html: string) => {
        setEditingId(null);
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
      toggleCollapse: (id: string) => apply(toggleCollapse(docRef.current, id)),
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
      // Click the node's 📝 indicator → select it and ask the app to open the Notes tab.
      openNote: (id: string) => {
        selectOnly(id);
        fireSelect(id);
        onOpenNoteRef.current?.();
      },
    };
  }, [editingId, apply, focusNodeById, selectOnly, fireSelect]);

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

  // Report the selection count up (the inspector switches to bulk mode when >1).
  const onSelectionCountRef = useRef(onSelectionCount);
  onSelectionCountRef.current = onSelectionCount;
  useEffect(() => {
    onSelectionCountRef.current?.(selectedIds.size);
  }, [selectedIds]);

  // Report a per-field "mixed" summary of the selection, so the inspector can blank-out + label a
  // task field the selected topics disagree on (instead of showing the anchor's value). Keyed on the
  // live doc too, so a bulk edit re-fires and collapses "Mixed" → the just-applied uniform value.
  const onSelectionFieldsRef = useRef(onSelectionFields);
  onSelectionFieldsRef.current = onSelectionFields;
  useEffect(() => {
    onSelectionFieldsRef.current?.(selectionFields(renderDoc, selectedIds));
  }, [selectedIds, renderDoc]);

  // Markers/tags-on-all-vs-some summary for tri-state bulk chips. Keyed on the live doc too, so a
  // bulk toggle re-fires and a value flips between "all" and "some" as topics gain/lose it.
  const onSelectionMarkerTagsRef = useRef(onSelectionMarkerTags);
  onSelectionMarkerTagsRef.current = onSelectionMarkerTags;
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
    requestAnimationFrame(() => fitView({ duration: 300 }));
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
  useEffect(() => {
    setNodes((ns) =>
      ns.map((n) => {
        const dimmed = litIds ? !litIds.has(n.id) : false;
        return Boolean(n.data.dimmed) === dimmed ? n : { ...n, data: { ...n.data, dimmed } };
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
  }, [litIds, setNodes, setEdges]);

  // One-time refine once React Flow has measured the nodes (better sizing than estimates).
  const refined = useRef(false);
  useEffect(() => {
    if (!initialized || refined.current) return;
    refined.current = true;
    sync(docRef.current);
  }, [initialized, sync]);

  // Delete a node, confirming first when it has descendants — Delete removes the whole branch
  // below it, so a guard prevents an accidental keystroke from wiping a subtree. Shared by the
  // keyboard Delete, the context menu, and the on-node popover so the confirm is consistent.
  const confirmDeleteNode = useCallback(
    (id: string) => {
      const node = findAnyNode(docRef.current, id);
      const kids = node ? countDescendants(node) : 0;
      if (kids > 0) {
        const label = node?.topic?.trim() || "this topic";
        if (
          !window.confirm(
            `Delete "${label}" and its ${kids} sub-topic${kids === 1 ? "" : "s"}? This removes the whole branch.`,
          )
        )
          return;
      }
      apply(deleteNode(docRef.current, id));
    },
    [apply],
  );

  // Keyboard tree-building (when a node is selected and we're not inline-editing or in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && linkingFromRef.current) {
        setLinkingFrom(null);
        return;
      }
      if (editingRef.current) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)))
        return;
      // Undo/redo work regardless of selection.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redoAction();
        else undoAction();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redoAction();
        return;
      }
      const id = selectedRef.current;
      if (!id) return;
      if (e.key === "Enter") {
        e.preventDefault();
        // Ctrl/⌘+Enter adds a child; plain Enter adds a sibling.
        if (e.ctrlKey || e.metaKey) apply(addChild(docRef.current, id), true);
        else apply(addSibling(docRef.current, id), true);
      } else if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        apply(addChild(docRef.current, id), true);
      } else if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        apply(outdent(docRef.current, id));
      } else if (e.key === "Delete") {
        e.preventDefault();
        confirmDeleteNode(id);
      } else if (e.key === "F2") {
        e.preventDefault();
        setEditingId(id);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [apply, undoAction, redoAction, confirmDeleteNode]);

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

  // Apply a pure cross-link op to the selected relationship edge (the edge-inspector path); false if
  // no edge is selected. Mirrors withSelected for nodes.
  const withSelectedLink = useCallback(
    (op: (doc: MindMapDoc, id: string) => OpResult): boolean => {
      const id = selectedEdgeIdRef.current;
      if (!id) return false;
      apply(op(docRef.current, id));
      return true;
    },
    [apply],
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
        );
        return new Blob([svg], { type: "image/svg+xml" });
      },
      fit: () => fitView({ duration: 300 }),
      focusNode: focusNodeById,
      setSelectedImage: (image) => withSelected((id) => apply(setImage(docRef.current, id, image))),
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
      replaceTopics: (query, replacement) => {
        const res = replaceTopics(docRef.current, query, replacement);
        if (res.count > 0) apply({ doc: res.doc });
        return res.count;
      },
      setAllExpanded: (expanded) => apply(setAllExpanded(docRef.current, expanded)),
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
      setSelectedHyperlink: (url) =>
        withSelected((id) => apply(setHyperlink(docRef.current, id, url))),
      groupBranch: (id) => {
        apply(groupBranch(docRef.current, id));
        return Boolean(findNode(docRef.current, id));
      },
      groupSummary: (id) => {
        apply(groupSummary(docRef.current, id));
        return Boolean(findNode(docRef.current, id));
      },
      renameMap: (title) => apply(setTopic(docRef.current, docRef.current.root.id, title)),
      setBackground: (color) => apply(setBackground(docRef.current, color)),
      setBackgroundImage: (url) => apply(setBackgroundImage(docRef.current, url)),
      setLineJumps: (on) => apply(setLineJumps(docRef.current, on)),
      setRules: (rules) => apply(setRules(docRef.current, rules)),
      setSelectedTags: (tags) => withSelected((id) => apply(setTags(docRef.current, id, tags))),
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
        withSelectedOverlay((sel) => {
          if (sel.kind === "boundary") return setBoundaryLabel(docRef.current, sel.id, label);
          if (sel.kind === "summary") return setSummaryLabel(docRef.current, sel.id, label);
          return setCalloutText(docRef.current, sel.nodeId ?? "", sel.id, label);
        }),
      setOverlayColor: (color) => {
        const sel = selectedOverlayRef.current;
        const ok = withSelectedOverlay((s) => {
          if (s.kind === "boundary") return setBoundaryColor(docRef.current, s.id, color);
          if (s.kind === "summary") return setSummaryColor(docRef.current, s.id, color);
          return setCalloutColor(docRef.current, s.nodeId ?? "", s.id, color);
        });
        // Re-emit the (unchanged) selection so the inspector's swatch reflects the new colour.
        if (ok && sel) fireSelectOverlay({ kind: sel.kind, id: sel.id, nodeId: sel.nodeId });
        return ok;
      },
      deleteOverlay: () => {
        const ok = withSelectedOverlay((sel) => {
          if (sel.kind === "boundary") return deleteBoundary(docRef.current, sel.id);
          if (sel.kind === "summary") return deleteSummary(docRef.current, sel.id);
          return deleteCallout(docRef.current, sel.nodeId ?? "", sel.id);
        });
        if (ok) clearOverlaySelection();
        return ok;
      },
      setBackdropColor: (color) => apply(setBackdropColor(docRef.current, color)),
    }),
    [
      fitView,
      getNodes,
      apply,
      withSelected,
      withSelectedAll,
      withSelectedLink,
      withSelectedOverlay,
      clearOverlaySelection,
      fireSelectOverlay,
      focusNodeById,
    ],
  );

  return (
    <EditingContext.Provider value={editingApi}>
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
            e.dataTransfer.types.includes("text/uri-list") ||
            e.dataTransfer.types.includes("text/plain")
          ) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={(e) => {
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
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable
          nodesConnectable={false}
          deleteKeyCode={null}
          zoomOnDoubleClick={false}
          colorMode={(theme ?? mindManagerTheme).type}
          proOptions={{ hideAttribution: true }}
          minZoom={0.2}
          maxZoom={3}
          fitView
          // Drag the empty canvas to rubber-band a multi-selection; pan with the middle/right
          // button (selectionOnDrag claims the left button). Shift/Ctrl/Cmd-click extends.
          selectionOnDrag
          panOnDrag={[1, 2]}
          selectionKeyCode={null}
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
          onNodeDragStop={(_, node) => handleDragStop(node.id, node.position)}
          onEdgeContextMenu={(e, edge) => {
            e.preventDefault();
            if (edge.type !== "crosslink") return;
            if (window.confirm("Delete this relationship?"))
              apply(deleteLink(docRef.current, edge.id));
          }}
        >
          <Background color="var(--mm-line-color, #d8d8d8)" gap={24} />
          <BackgroundImage url={renderDoc.meta?.backgroundImage} />
          <DiagramBackdrop backdrop={renderDoc.backdrop} />
          <BraceConnectors braces={braces} />
          <Boundaries
            boundaries={boundaries}
            selectedId={selectedOverlay?.kind === "boundary" ? selectedOverlay.id : null}
            onSelect={handleSelectBoundary}
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
          {/* Inline contextual popover — quick structural actions above the selected node. Uses the
              same internal handlers as the keyboard + right-click menu, and React Flow's NodeToolbar
              for node-tracked positioning (stays put through pan/zoom). Hidden while inline-editing. */}
          {selectedId && editingId !== selectedId
            ? (() => {
                const sid = selectedId;
                const sel = findAnyNode(renderDoc, sid);
                const isRootSel = sid === renderDoc.root.id;
                const hasKids = (sel?.children?.length ?? 0) > 0;
                return (
                  <NodeToolbar nodeId={sid} isVisible position={Position.Top} offset={10}>
                    <div
                      className="nodrag nopan"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        background: colors.white,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 11,
                        padding: 4,
                        boxShadow: "0 10px 30px rgba(40,30,16,0.18)",
                      }}
                    >
                      <PopBtn
                        icon="child"
                        label="Add child"
                        onClick={() => apply(addChild(docRef.current, sid), true)}
                      />
                      {!isRootSel ? (
                        <PopBtn
                          icon="plus"
                          label="Add sibling"
                          onClick={() => apply(addSibling(docRef.current, sid), true)}
                        />
                      ) : null}
                      <PopBtn icon="text" label="Rename" onClick={() => setEditingId(sid)} />
                      {hasKids ? (
                        <PopBtn
                          icon="minus"
                          label="Collapse / expand"
                          onClick={() => apply(toggleCollapse(docRef.current, sid))}
                        />
                      ) : null}
                      {!isRootSel ? (
                        <PopBtn
                          icon="trash"
                          label="Delete"
                          danger
                          onClick={() => confirmDeleteNode(sid)}
                        />
                      ) : null}
                    </div>
                  </NodeToolbar>
                );
              })()
            : null}
          <Controls showInteractive={false} />
          {minimapOpen ? (
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => (node.data as TopicNodeT["data"])?.branchColor ?? "#bbb"}
              nodeStrokeWidth={3}
              style={{ marginBottom: 30 }}
            />
          ) : null}
          <Panel position="bottom-right">
            <button
              type="button"
              onClick={toggleMinimap}
              title={minimapOpen ? "Hide minimap" : "Show minimap"}
              style={{
                font: "12px system-ui, sans-serif",
                padding: "2px 8px",
                borderRadius: 6,
                border: `1px solid ${colors.menu.border}`,
                background: `var(--mm-node-bg, ${colors.menu.fallbackBg})`,
                color: `var(--mm-color, ${colors.menu.fallbackColor})`,
                cursor: "pointer",
                boxShadow: "0 1px 3px #0002",
              }}
            >
              {minimapOpen ? "Minimap ▾" : "Minimap ▴"}
            </button>
          </Panel>
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
                ["Rename", () => setEditingId(id)],
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
              items.push(["Delete", () => confirmDeleteNode(id), true]);
              return (
                <>
                  {items.map(([label, fn, danger]) => (
                    <MenuItem key={label} label={label} danger={danger} onSelect={fn} />
                  ))}
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
                        apply(setNodeLayout(docRef.current, menu.id, e.target.value || undefined));
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
