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
import { colors } from "../design/tokens";
import { hasFormatting, richToPlain, sanitizeRich } from "../io/richText";
import { isDangerousUrl } from "../io/urlSafety";
import type { Boundary, MapNode, MindMapDoc, Summary } from "../model/types";
import { nextProgressLevel } from "../progress";
import { getBranch, setBranch } from "../store/branchClipboard";
import { todayISO } from "../taskDate";
import { type LayoutKind, type MindMapHandle, type MindMapProps, classifyLink } from "./contract";
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
  clearBackdrop,
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
  setAllExpanded,
  setBackdrop,
  setBackdropRings,
  setBackground,
  setBackgroundImage,
  setCalloutText,
  setDue,
  setFreeform,
  setHyperlink,
  setImage,
  setLineJumps,
  setLinkLabel,
  setNodeLayout,
  setNodePos,
  setNote,
  setPriority,
  setProgress,
  setRollup,
  setRules,
  setStart,
  setSummaryLabel,
  setTags,
  setTopicRich,
  toggleCollapse,
  toggleIcon,
} from "./flow/ops";
import { project } from "./flow/project";
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
  onMapLink,
  ref,
}: MindMapProps) {
  const palette = (theme ?? mindManagerTheme).palette;
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
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // Re-project + re-layout from a doc (with measured sizes when available, else estimated).
  const sync = useCallback(
    (newDoc: MindMapDoc, nextSelected?: string | null) => {
      docRef.current = newDoc;
      setRenderDoc(newDoc);
      if (nextSelected !== undefined) selectedRef.current = nextSelected;
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
      const sel = selectedRef.current;
      const lit = litIdsRef.current;
      setNodes(
        proj.nodes.map((n) => ({
          ...n,
          position: pos.get(n.id) ?? { x: 0, y: 0 },
          selected: n.id === sel,
          data: lit ? { ...n.data, dimmed: !lit.has(n.id) } : n.data,
        })),
      );
      // Brace map hides the tapered branch ribbons (the "{" forks replace them); cross-links stay.
      const brace = kind === "brace";
      setEdges(
        lit || brace
          ? proj.edges.map((e) => ({
              ...e,
              ...(brace && !e.data?.crosslink ? { hidden: true } : {}),
              data: lit
                ? { ...(e.data as EdgeData), dimmed: !(lit.has(e.source) && lit.has(e.target)) }
                : e.data,
            }))
          : proj.edges,
      );
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
        historyRef.current = record(historyRef.current, docRef.current); // snapshot the old doc
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
      setSelectedId(id);
      fireSelect(id);
      const w = n.measured?.width ?? 0;
      const h = n.measured?.height ?? 0;
      setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom: 1, duration: 300 });
    },
    [getNodes, fireSelect, setCenter],
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
    };
  }, [editingId, apply, focusNodeById]);

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
  }, [apply, undoAction, redoAction]);

  // Close the context menu on any click/Escape outside it.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest?.("[data-mm-menu]")) setMenu(null);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    document.addEventListener("keydown", onEsc);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menu]);

  const withSelected = useCallback((fn: (id: string) => void): boolean => {
    const id = selectedRef.current;
    if (!id) return false;
    fn(id);
    return true;
  }, []);

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
      setSelectedStyle: (patch) =>
        withSelected((id) => apply(mergeStyle(docRef.current, id, patch))),
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
      setBackground: (color) => apply(setBackground(docRef.current, color)),
      setBackgroundImage: (url) => apply(setBackgroundImage(docRef.current, url)),
      setLineJumps: (on) => apply(setLineJumps(docRef.current, on)),
      setRules: (rules) => apply(setRules(docRef.current, rules)),
      setSelectedTags: (tags) => withSelected((id) => apply(setTags(docRef.current, id, tags))),
      setSelectedProgress: (progress) =>
        withSelected((id) => apply(setProgress(docRef.current, id, progress))),
      setSelectedDue: (due) => withSelected((id) => apply(setDue(docRef.current, id, due))),
      setSelectedStart: (start) => withSelected((id) => apply(setStart(docRef.current, id, start))),
      setSelectedPriority: (priority) =>
        withSelected((id) => apply(setPriority(docRef.current, id, priority))),
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
    }),
    [fitView, getNodes, apply, withSelected, focusNodeById],
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
          onNodeClick={(_, node) => {
            // In "Link to…" mode, the next click on a *different* node completes the relationship.
            if (linkingFrom && node.id !== linkingFrom) {
              const label = window.prompt("Relationship label (optional):", "") ?? "";
              apply(addLink(docRef.current, linkingFrom, node.id, label));
              setLinkingFrom(null);
              return;
            }
            setLinkingFrom(null);
            setSelectedId(node.id);
            fireSelect(node.id);
            setMenu(null);
          }}
          onPaneClick={() => {
            setLinkingFrom(null);
            setSelectedId(null);
            fireSelect(null);
            setMenu(null);
          }}
          onNodeContextMenu={(e, node) => {
            e.preventDefault();
            setSelectedId(node.id);
            fireSelect(node.id);
            setMenu({ x: e.clientX, y: e.clientY, id: node.id });
          }}
          onNodeDragStop={(_, node) => handleDragStop(node.id, node.position)}
          onEdgeDoubleClick={(_, edge) => {
            if (edge.type !== "crosslink") return;
            const cur = (docRef.current.links ?? []).find((l) => l.id === edge.id);
            const label = window.prompt("Relationship label (blank for none):", cur?.label ?? "");
            if (label !== null) apply(setLinkLabel(docRef.current, edge.id, label));
          }}
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
          <Boundaries boundaries={boundaries} />
          <Summaries summaries={summaries} onRename={handleRenameSummary} />
          <Callouts
            items={calloutItems}
            onCommit={handleCommitCallout}
            onDelete={handleDeleteCallout}
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
                          onClick={() => apply(deleteNode(docRef.current, sid))}
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
          <ul
            data-mm-menu
            style={{
              position: "fixed",
              left: menu.x,
              top: menu.y,
              zIndex: 20,
              margin: 0,
              padding: 4,
              listStyle: "none",
              background: `var(--mm-node-bg, ${colors.menu.fallbackBg})`,
              color: `var(--mm-color, ${colors.menu.fallbackColor})`,
              border: `1px solid ${colors.menu.border}`,
              borderRadius: 8,
              boxShadow: "0 4px 14px #0003",
              font: "13px system-ui, sans-serif",
              minWidth: 168,
            }}
          >
            {(() => {
              const id = menu.id;
              const items: [string, () => void][] = [
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
              items.push(["Delete", () => apply(deleteNode(docRef.current, id))]);
              return items;
            })().map(([label, fn]) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => {
                    fn();
                    setMenu(null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "5px 10px",
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    borderRadius: 5,
                    font: "inherit",
                  }}
                >
                  {label}
                </button>
              </li>
            ))}
            <li
              style={{
                padding: "5px 10px",
                borderTop: `1px solid ${colors.menu.separator}`,
                marginTop: 2,
              }}
            >
              <label style={{ fontSize: 12, color: colors.muted, display: "block" }}>
                Branch layout{" "}
                <select
                  defaultValue={findNode(docRef.current, menu.id)?.layout ?? ""}
                  onChange={(e) => {
                    apply(setNodeLayout(docRef.current, menu.id, e.target.value || undefined));
                    setMenu(null);
                  }}
                  style={{ font: "inherit", marginTop: 2 }}
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
            </li>
          </ul>
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
