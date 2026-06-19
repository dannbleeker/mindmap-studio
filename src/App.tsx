import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Kanban } from "./Kanban";
import {
  FilterPanel,
  HistoryPanel,
  InfoPanel,
  MarkerTagIndex,
  type NamedStyle,
  OutlinePanel,
  PlaybackBar,
  StylesPanel,
} from "./Panels";
import { CommandPalette } from "./components/CommandPalette";
import { Dialog } from "./components/Dialog";
import { DocumentTabs } from "./components/DocumentTabs";
import { EdgeInspector } from "./components/EdgeInspector";
import { FirstRunCard } from "./components/FirstRunCard";
import { IconRail } from "./components/IconRail";
import { InspectorRail } from "./components/InspectorRail";
import { MapPanel } from "./components/MapPanel";
import { OverlayInspector } from "./components/OverlayInspector";
import { ShortcutsDialog } from "./components/ShortcutsDialog";
import { Toolbar, type ToolbarProps } from "./components/Toolbar";
import { buildEditorCommands } from "./components/editorCommands";
import { StartScreen } from "./components/start/StartScreen";
import "./design/editor.css";
import { editorThemeVars } from "./design/tokens";
import { type FilterCriteria, filterResult, focusSet, isFilterActive } from "./filter";
import { clampIndex, togglePlay } from "./historyPlayback";
import { useOpenDocuments } from "./hooks/useOpenDocuments";
import { usePanels } from "./hooks/usePanels";
import { useVersionHistory } from "./hooks/useVersionHistory";
import { MARKER_PALETTE } from "./icons";
import { fileToAttachment } from "./io/attachment";
import { fileToMapImage } from "./io/image";
import { parseDoc } from "./io/json";
import { serializeLibrary, tryParseLibrary } from "./io/library";
import { toMarkdown } from "./io/markdown";
import { parseOutline } from "./io/pasteOutline";
import {
  type CanvasSession,
  type LayoutKind,
  MAP_LINK_PREFIX,
  MindMap,
  type MindMapHandle,
  NODE_LINK_PREFIX,
  type SelectedEdge,
  type SelectedNode,
  type SelectedOverlay,
  type SelectionFields,
  type SelectionMarkerTags,
} from "./mindmap";
import { findAnyNode, nodePath } from "./mindmap/flow/ops";
import { sampleDoc } from "./model/sampleMap";
import type { MapNode, MindMapDoc } from "./model/types";
import { noteCounts } from "./noteFormat";
import { backlinksFor, outlineNumbers, outlineRows } from "./outline";
import { Presentation } from "./present/Presentation";
import {
  type ToastAction,
  type ToastKind,
  type ToastOptions,
  checkForUpdate,
  initPwaUpdateToast,
} from "./pwa/pwaUpdate";
import { refreshRollups } from "./rollup";
import { type LibraryHit, searchLibrary } from "./search";
import { stickerImage } from "./stickers";
import {
  type MapSummary,
  deleteMap,
  getAllMaps,
  getTabSession,
  listMaps,
  loadMap,
  saveMap,
  setLastOpened,
} from "./store/mapStore";
import { todayISO } from "./taskDate";
import { buildTemplate } from "./templates";
import { controlStyle, inputStyle, timeAgo } from "./ui";
import { useFind } from "./useFind";
import { useIsMobile } from "./useIsMobile";
import { useMapExports } from "./useMapExports";
import { useTheme } from "./useTheme";

// How many recently-used document tabs keep their canvas session (viewport + undo/redo) cached for
// lossless switching; beyond this the least-recently-used session is dropped (that tab reopens fresh).
const MAX_SESSIONS = 5;
// Cap the cached undo depth per tab so several tabs' histories don't balloon memory — the live canvas
// keeps the full depth; only the stashed copy is trimmed.
const CACHED_UNDO_DEPTH = 40;

/** Total topics in a parsed paste forest (for the dialog's live count). */
function countForest(nodes: MapNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countForest(n.children), 0);
}

export function App() {
  const [doc, setDoc] = useState<MindMapDoc>(sampleDoc);
  // A reactive mirror of the live doc for panels (Outline) — `doc` is only the
  // init prop for MindMap (changes on load), so edits update this without re-init.
  const [liveDoc, setLiveDoc] = useState<MindMapDoc>(sampleDoc);
  const liveDocRef = useRef<MindMapDoc>(sampleDoc);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MindMapHandle>(null);
  // Per-tab canvas sessions (viewport + undo/redo), captured on switch-away and restored on switch-back
  // so the recently-used tabs are lossless. An LRU Map capped at MAX_SESSIONS; one-shot on restore.
  const sessionCache = useRef<Map<string, CanvasSession>>(new Map());
  const [maps, setMaps] = useState<MapSummary[]>([]);
  // Start screen vs editor. Default to the editor so a returning user's last map restores without a
  // flash; the boot effect flips to "start" only when there's no map to restore (first run / empty
  // library). The "⌂ Start" toolbar button returns here any time. The editor canvas is unchanged.
  const [view, setView] = useState<"start" | "editor">("editor");
  // Phone-width: the editor toolbar switches to a compact single horizontally-scrollable strip
  // (the desktop layout wraps into a wall of rows on a narrow screen, burying the canvas).
  const isMobile = useIsMobile();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [presentDoc, setPresentDoc] = useState<MindMapDoc | null>(null);
  // Transient toast: a message + an optional action button (e.g. "Refresh now").
  const [toast, setToast] = useState<{
    kind: ToastKind;
    message: string;
    action?: ToastAction;
  } | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme, setThemeId } = useTheme();
  const [layout, setLayout] = useState<LayoutKind>(() => {
    const valid = [
      "side",
      "left",
      "right",
      "org-down",
      "org-up",
      "radial",
      "timeline",
      "fishbone",
      "grid",
      "brace",
    ];
    try {
      // A ?layout= query param wins (shareable layout links); else the persisted choice.
      const q = new URLSearchParams(window.location.search).get("layout");
      if (q && valid.includes(q)) return q as LayoutKind;
      const ls = localStorage.getItem("mindmap-layout");
      if (ls && valid.includes(ls)) return ls as LayoutKind;
    } catch {
      // ignore
    }
    return "side";
  });
  const { query, setQuery, replaceWith, setReplaceWith, matchInfo, runSearch, runReplace } =
    useFind(mapRef, () => liveDocRef.current);

  function changeLayout(value: LayoutKind) {
    setLayout(value);
    try {
      localStorage.setItem("mindmap-layout", value);
    } catch {
      // preference is best-effort
    }
  }
  // Notes editor: tracks the selected node and a debounced draft of its note.
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  // How many nodes are selected on the canvas (the inspector switches to bulk mode when >1).
  const [selectedCount, setSelectedCount] = useState(0);
  // Per-field "mixed" summary of a multi-selection — lets the inspector blank-out + label fields the
  // selected topics disagree on, instead of showing (and silently overwriting from) the anchor's.
  const [selectionFields, setSelectionFields] = useState<SelectionFields | null>(null);
  // Markers/tags-on-all-vs-some across the selection — drives the inspector's tri-state bulk chips.
  const [selectionMarkerTags, setSelectionMarkerTags] = useState<SelectionMarkerTags | null>(null);
  // The selected relationship (cross-link) edge, if any — swaps the right slot to the EdgeInspector.
  // Mutually exclusive with node selection (the canvas drives both callbacks).
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdge | null>(null);
  // The selected overlay object (boundary/summary/callout) — swaps the right slot to the
  // OverlayInspector. Mutually exclusive with node + edge selection (canvas-driven).
  const [selectedOverlay, setSelectedOverlay] = useState<SelectedOverlay | null>(null);
  // Bumped when a node's 📝 indicator is clicked → InfoPanel switches to its Notes tab.
  const [noteNonce, setNoteNonce] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  // Live undo/redo availability, reported up by the canvas, so the Row-1 buttons disable correctly (#8).
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Panel open/close + Power-Filter + saved-filter presets (with their localStorage persistence) all
  // live in usePanels; App threads `panels` into <Toolbar> and `filter`/`savedFilters` into the
  // FilterPanel. Auto-numbering (`panels.numbered`) draws hierarchical outline numbers on the canvas.
  const { panels, filter, savedFilters } = usePanels();
  // Open-document tabs: which maps are open + which is active (persisted). The active map's state
  // still lives in the doc/liveDoc singletons below — this registry just follows it (load() calls
  // ensureOpen) and drives the tab strip; switching a tab reloads that map.
  const { openIds, ensureOpen, closeTab, restoreSession } = useOpenDocuments();
  const [outlineFilter, setOutlineFilter] = useState("");
  // Named styles ("styles organizer"), persisted app-wide so a look is reusable across maps.
  const [namedStyles, setNamedStyles] = useState<NamedStyle[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("mindmap-named-styles") ?? "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("mindmap-named-styles", JSON.stringify(namedStyles));
    } catch {
      // preference is best-effort
    }
  }, [namedStyles]);
  const saveNamedStyle = (name: string) => {
    const style = selectedNode?.style;
    if (!style || Object.keys(style).length === 0) {
      showHint("Select a styled topic first (style it, then save it as a named style).");
      return;
    }
    setNamedStyles((prev) => [
      ...prev.filter((s) => s.name !== name),
      { id: crypto.randomUUID(), name, style },
    ]);
  };
  const deleteNamedStyle = (id: string) =>
    setNamedStyles((prev) => prev.filter((s) => s.id !== id));
  // Memoised so the canvas only re-dims when the map or the criteria actually change. The deps stay
  // plain primitives/arrays (the individual filter fields), so a fresh `filter.criteria` object each
  // render doesn't needlessly recompute — only an actual field change does.
  const { text, markers, tags, due, priority } = filter;
  const filterHits = useMemo(() => {
    const criteria: FilterCriteria = { text, markers, tags, due, priority: priority || undefined };
    if (!panels.filterOpen || !isFilterActive(criteria)) return null;
    return filterResult(liveDoc, criteria, todayISO());
  }, [panels.filterOpen, text, markers, tags, due, priority, liveDoc]);
  // Focus / isolate-branch: session-only, reuses the Power Filter's dim pipeline. Focus wins over
  // the filter as the dim source; both fall back to "no dimming".
  // The full selected node (for the Info panel's tags / markers / link state); `selected` only
  // carries id/topic/note, so look the rest up in the live doc.
  const selectedNode = useMemo<MapNode | null>(() => {
    if (!selected) return null;
    const find = (n: MapNode): MapNode | null => {
      if (n.id === selected.id) return n;
      for (const c of n.children) {
        const hit = find(c);
        if (hit) return hit;
      }
      return null;
    };
    return find(liveDoc.root) ?? liveDoc.floatingTopics?.map(find).find(Boolean) ?? null;
  }, [selected, liveDoc]);
  // Inspector header breadcrumb (ancestor path) + quick-facts line (outline number, depth, child
  // count, note size). Memoised so the whole-tree outline-number walk only reruns on doc/selection.
  const inspectorInfo = useMemo(() => {
    if (!selected || !selectedNode) return { breadcrumb: "", facts: "", times: "" };
    const path = nodePath(liveDoc, selected.id);
    const breadcrumb = (path?.ancestors ?? []).map((a) => a.topic || "(untitled)").join(" › ");
    const outlineNo = outlineNumbers(liveDoc.root).get(selected.id);
    const counts = noteCounts(selectedNode.note ?? "");
    const kids = selectedNode.children.length;
    const facts = [
      outlineNo ? `#${outlineNo}` : null,
      `depth ${path?.depth ?? 0}`,
      `${kids} ${kids === 1 ? "child" : "children"}`,
      counts.chars ? `note ${counts.words}w · ${counts.chars}c` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    // Created / modified (when the node carries them) — a second, fainter facts line via timeAgo.
    const times = [
      selectedNode.createdAt ? `created ${timeAgo(selectedNode.createdAt)}` : null,
      selectedNode.modifiedAt ? `modified ${timeAgo(selectedNode.modifiedAt)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return { breadcrumb, facts, times };
  }, [selected, selectedNode, liveDoc]);
  // Topics that point AT the selected node (incoming #node= links + relationship edges) — the
  // inspector's "Linked from" jumps. Memoised on the live doc + selection so it doesn't re-walk the
  // tree on every render; rename of a source stays correct because liveDoc is a dependency.
  const backlinks = useMemo(
    () => (selected ? backlinksFor(liveDoc, selected.id) : []),
    [selected, liveDoc],
  );
  // The selected relationship's endpoint topics (for the EdgeInspector's "From → To" caption),
  // resolved live so renames stay correct.
  const edgeTopics = useMemo(() => {
    const link = selectedEdge ? liveDoc.links?.find((l) => l.id === selectedEdge.id) : undefined;
    return {
      from: (link && findAnyNode(liveDoc, link.from)?.topic) || "",
      to: (link && findAnyNode(liveDoc, link.to)?.topic) || "",
    };
  }, [selectedEdge, liveDoc]);
  // A human caption for the OverlayInspector header — live from the doc. Boundary/summary → member
  // count; callout → its parent topic.
  const overlayCaption = useMemo(() => {
    if (!selectedOverlay) return "";
    if (selectedOverlay.kind === "callout") {
      return selectedOverlay.nodeId
        ? findAnyNode(liveDoc, selectedOverlay.nodeId)?.topic || ""
        : "";
    }
    const arr = selectedOverlay.kind === "boundary" ? liveDoc.boundaries : liveDoc.summaries;
    const obj = arr?.find((o) => o.id === selectedOverlay.id);
    const n = obj?.nodeIds.length ?? 0;
    return `${n} ${n === 1 ? "topic" : "topics"}`;
  }, [selectedOverlay, liveDoc]);
  // Auto-show the right-side inspector when a node is selected (the redesign's auto-show behaviour).
  // Sticky minimize wins: if the user has collapsed the inspector to its strip, selecting another
  // node does NOT force it back open (selectedNode still updates, so re-expanding shows the new node).
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on selection id; setters are stable.
  useEffect(() => {
    if ((selected || selectedEdge || selectedOverlay) && !panels.infoMinimized)
      panels.setInfoOpen(true);
  }, [selected?.id, selectedEdge?.id, selectedOverlay?.id]);
  const [focus, setFocus] = useState<{ id: string; topic: string } | null>(null);
  const focusLit = useMemo(() => (focus ? focusSet(liveDoc, focus.id) : null), [focus, liveDoc]);
  const litIds = focusLit && focusLit.size > 0 ? focusLit : (filterHits?.lit ?? null);
  // Drop a focus whose node has been deleted, and let Esc clear it.
  useEffect(() => {
    if (focus && (!focusLit || focusLit.size === 0)) setFocus(null);
  }, [focus, focusLit]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocus(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // First-run "3 things to try" card (#13): shown once for a brand-new user, dismissed for good on
  // the first edit or an explicit close. Best-effort localStorage, like the theme + panel prefs.
  const [firstRunSeen, setFirstRunSeen] = useState(() => {
    try {
      return localStorage.getItem("mindmap-first-run-seen") === "1";
    } catch {
      return true; // can't persist → don't nag
    }
  });
  const dismissFirstRun = useCallback(() => {
    setFirstRunSeen(true);
    try {
      localStorage.setItem("mindmap-first-run-seen", "1");
    } catch {
      // best-effort
    }
  }, []);
  const [searchAllOpen, setSearchAllOpen] = useState(false);
  // In-editor ⌘K command palette (the Start screen has its own). Cmd/Ctrl+K opens it.
  const [cmdkOpen, setCmdkOpen] = useState(false);
  useEffect(() => {
    if (view !== "editor") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view]);
  const [libDocs, setLibDocs] = useState<MindMapDoc[]>([]);
  const [libQuery, setLibQuery] = useState("");
  // "Paste text → map": parse a pasted outline into topics, as a new map or under the selection.
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const pendingFocus = useRef<string | null>(null);
  const noteCommit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  function handleSelect(sel: SelectedNode | null) {
    // Only reset the draft when the selected node actually changes — a note
    // commit re-fires selection for the same node, which must not clobber typing.
    const changed = sel?.id !== selectedIdRef.current;
    selectedIdRef.current = sel?.id ?? null;
    setSelected(sel);
    if (changed) setNoteDraft(sel?.note ?? "");
  }

  function onNoteChange(value: string) {
    setNoteDraft(value);
    if (noteCommit.current) clearTimeout(noteCommit.current);
    noteCommit.current = setTimeout(() => mapRef.current?.setSelectedNote(value), 400);
  }

  function flushNote() {
    if (noteCommit.current) clearTimeout(noteCommit.current);
    mapRef.current?.setSelectedNote(noteDraft);
  }

  // Core toast. Stable (no deps) so it can be injected into the PWA updater once.
  const showToast = useCallback((kind: ToastKind, message: string, opts?: ToastOptions) => {
    setToast({ kind, message, action: opts?.action });
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setToast(null), opts?.durationMs ?? 4000);
  }, []);

  // Message-only shorthand used across the toolbar handlers.
  const showHint = (message: string) => showToast("info", message);

  // Register the PWA self-updater once: a new deploy surfaces a "Refresh now" toast
  // through showToast (no-op in dev — the service worker is disabled there).
  useEffect(() => {
    initPwaUpdateToast(showToast);
  }, [showToast]);

  // Copy the map as a Markdown outline straight to the clipboard — no file download —
  // for pasting into an email, chat, or doc.
  async function copyOutline() {
    try {
      await navigator.clipboard.writeText(toMarkdown(liveDocRef.current));
      showHint("Outline copied to clipboard");
    } catch {
      showHint("Couldn't access the clipboard");
    }
  }

  const refreshMaps = useCallback(async () => {
    try {
      setMaps(await listMaps());
    } catch {
      // library listing is best-effort
    }
  }, []);

  // Version history (the 🕔 History panel's snapshot list, throttled auto-save, in-place restore, and
  // timeline playback) lives in its own hook. App feeds maybeSnapshot into the autosave path below and
  // renders versions / playback / restoreRev; restoreRev remounts the canvas on an in-place restore.
  const {
    versions,
    restoreRev,
    playback,
    setPlayback,
    refreshVersions,
    saveVersionNow,
    restoreVersion,
    startPlayback,
    maybeSnapshot,
  } = useVersionHistory({ liveDocRef, setLiveDoc, setDoc, refreshMaps, showHint });

  const persist = useCallback(
    // `snapshot` is true only on edit-driven saves — opening/switching a map shouldn't create a
    // version, or pure reloads would spam the history.
    async (d: MindMapDoc, snapshot = false) => {
      try {
        await saveMap(d);
        await setLastOpened(d.id);
        await refreshMaps();
        // Edit-driven saves feed the version-history auto-snapshot (throttle lives inside the hook).
        if (snapshot) maybeSnapshot(d);
      } catch {
        // autosave is best-effort
      }
    },
    [refreshMaps, maybeSnapshot],
  );

  const load = useCallback(
    (next: MindMapDoc, nextWarnings: string[] = []) => {
      // Stash the outgoing map's canvas session (viewport + undo/redo) so switching back to it is
      // lossless. Captured here, while the old canvas is still mounted, before the doc swaps.
      const prev = liveDocRef.current;
      if (prev && prev.id !== next.id && mapRef.current) {
        const session = mapRef.current.getSession();
        sessionCache.current.delete(prev.id); // re-insert to bump LRU recency
        sessionCache.current.set(prev.id, {
          viewport: session.viewport,
          history: {
            past: session.history.past.slice(-CACHED_UNDO_DEPTH),
            future: session.history.future,
          },
        });
        while (sessionCache.current.size > MAX_SESSIONS) {
          const oldest = sessionCache.current.keys().next().value;
          if (oldest === undefined) break;
          sessionCache.current.delete(oldest);
        }
      }
      liveDocRef.current = next;
      setLiveDoc(next);
      setWarnings(nextWarnings);
      setError(null);
      setDoc(next);
      ensureOpen(next.id); // register/activate this map's tab (the registry follows the active map)
      persist(next);
    },
    [persist, ensureOpen],
  );

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(liveDocRef.current, true), 500);
  }

  // Refresh the history list whenever the panel opens.
  useEffect(() => {
    if (panels.historyOpen) refreshVersions();
  }, [panels.historyOpen, refreshVersions]);

  // --- paste text → map ---
  function pasteAsNewMap() {
    const forest = parseOutline(pasteText);
    if (forest.length === 0) {
      showHint("Nothing to add — paste an outline first.");
      return;
    }
    const root: MapNode =
      forest.length === 1 ? forest[0] : { id: "root", topic: "Pasted map", children: forest };
    load({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title: root.topic,
      root,
      meta: { source: "paste" },
    });
    setPasteOpen(false);
    setPasteText("");
    showHint("Created a map from the pasted text.");
  }

  function pasteUnderSelected() {
    const forest = parseOutline(pasteText);
    if (forest.length === 0) {
      showHint("Nothing to add — paste an outline first.");
      return;
    }
    if (!mapRef.current?.addSubtreeToSelected(forest)) {
      showHint("Select a node first, or use New map.");
      return;
    }
    setPasteOpen(false);
    setPasteText("");
    showHint(`Added ${forest.length} topic${forest.length === 1 ? "" : "s"} under the selection.`);
  }

  async function parseImport(
    file: File,
    importMmap: () => Promise<typeof import("./import/mmap")>,
  ): Promise<{ doc: MindMapDoc; warnings: string[] }> {
    const name = file.name.toLowerCase();
    if (name.endsWith(".md") || name.endsWith(".markdown")) {
      // Markmap files are Markdown (optionally with a `---` frontmatter block); fromMarkmap strips
      // any frontmatter then delegates to the Markdown parser, so plain .md still imports fine.
      const { fromMarkmap } = await import("./io/markmap");
      return { doc: fromMarkmap(await file.text()), warnings: [] };
    }
    if (name.endsWith(".mmd") || name.endsWith(".mermaid")) {
      const { fromMermaid } = await import("./io/mermaid");
      return { doc: fromMermaid(await file.text()), warnings: [] };
    }
    if (name.endsWith(".json")) {
      return { doc: parseDoc(await file.text()), warnings: [] };
    }
    if (name.endsWith(".opml")) {
      const { fromOpml } = await import("./io/opml");
      return { doc: fromOpml(await file.text()), warnings: [] };
    }
    if (name.endsWith(".mm")) {
      const { fromFreemind } = await import("./io/freemind");
      return { doc: fromFreemind(await file.text()), warnings: [] };
    }
    if (name.endsWith(".xmind")) {
      const { fromXmind } = await import("./io/xmind");
      return { doc: fromXmind(new Uint8Array(await file.arrayBuffer())), warnings: [] };
    }
    if (name.endsWith(".smmx")) {
      const { fromSmmx } = await import("./io/smmx");
      return { doc: fromSmmx(new Uint8Array(await file.arrayBuffer())), warnings: [] };
    }
    if (name.endsWith(".docx")) {
      const { fromDocx } = await import("./io/docx");
      return { doc: fromDocx(new Uint8Array(await file.arrayBuffer())), warnings: [] };
    }
    if (name.endsWith(".xlsx")) {
      const { fromXlsx } = await import("./io/xlsx");
      return { doc: fromXlsx(new Uint8Array(await file.arrayBuffer())), warnings: [] };
    }
    if (name.endsWith(".itmz")) {
      const { fromIthoughts } = await import("./io/ithoughts");
      return { doc: fromIthoughts(new Uint8Array(await file.arrayBuffer())), warnings: [] };
    }
    if (name.endsWith(".mind")) {
      const { fromMind } = await import("./io/mindmeister");
      return { doc: fromMind(new Uint8Array(await file.arrayBuffer())), warnings: [] };
    }
    if (name.endsWith(".mup")) {
      const { fromMindMup } = await import("./io/mindmup");
      return { doc: fromMindMup(await file.text()), warnings: [] };
    }
    if (name.endsWith(".textpack") || name.endsWith(".textbundle")) {
      const { fromTextBundle } = await import("./io/textbundle");
      return { doc: fromTextBundle(new Uint8Array(await file.arrayBuffer())), warnings: [] };
    }
    const { parseMmap } = await importMmap();
    const result = parseMmap(new Uint8Array(await file.arrayBuffer()));
    return { doc: result.doc, warnings: result.warnings };
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportLibrary() {
    try {
      await saveMap(liveDocRef.current); // flush current edits into the backup
      const docs: MindMapDoc[] = [];
      for (const s of await listMaps()) {
        const d = await loadMap(s.id);
        if (d) docs.push(d);
      }
      downloadBlob(
        new Blob([serializeLibrary(docs)], { type: "application/json" }),
        "mindmap-library.json",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = ""; // allow re-selecting the same files
    await processFiles(files);
  }

  /** Import a set of files (shared by the file <input> and the start screen's drop zone). */
  async function processFiles(files: File[]) {
    if (files.length === 0) return;
    // A single .json that is a whole-library backup restores every map at once.
    if (files.length === 1 && files[0].name.toLowerCase().endsWith(".json")) {
      const lib = tryParseLibrary(await files[0].text());
      if (lib) {
        try {
          for (const m of lib) await saveMap(m);
          await refreshMaps();
          load(lib[0] ?? buildTemplate("blank"), [`Restored ${lib.length} maps from backup.`]);
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
        return;
      }
    }
    // Code-split: load the .mmap importer (fast-xml-parser, fflate) once, on demand.
    const importMmap = () => import("./import/mmap");
    const batch = files.length > 1;
    try {
      let lastDoc: MindMapDoc | null = null;
      let lastWarnings: string[] = [];
      const batchNotes: string[] = [];
      for (const file of files) {
        const { doc: next, warnings } = await parseImport(file, importMmap);
        next.id = crypto.randomUUID(); // each import becomes its own library entry
        if (batch) await saveMap(next); // persist every map in a batch
        if (warnings.length > 0) {
          const extra = warnings.length > 1 ? ` (+${warnings.length - 1} more)` : "";
          batchNotes.push(`${next.title}: ${warnings[0]}${extra}`);
        }
        lastDoc = next;
        lastWarnings = warnings;
      }
      if (!lastDoc) return;
      // Render the last import; for a batch, lead with a one-line summary.
      load(
        lastDoc,
        batch ? [`Imported ${files.length} maps into the library.`, ...batchNotes] : lastWarnings,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const image = await fileToMapImage(file);
      const applied = mapRef.current?.setSelectedImage(image);
      showHint(
        applied ? "Image added to the selected node." : "Select a node first, then add an image.",
      );
    } catch (err) {
      showHint(err instanceof Error ? err.message : "Could not add image");
    }
  }

  async function handleBackgroundImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      // Reuse the node-image pipeline (downscale + data URL) so a huge picture can't bloat the doc;
      // non-image files reject during decode and surface a hint.
      const { url } = await fileToMapImage(file);
      mapRef.current?.setBackgroundImage(url);
      showHint("Background image set for this map.");
    } catch (err) {
      showHint(err instanceof Error ? err.message : "Could not set background image");
    }
  }

  async function switchMap(id: string) {
    if (id === doc.id) return;
    try {
      await saveMap(liveDocRef.current); // flush current edits before switching
      const next = await loadMap(id);
      if (next) load(next);
    } catch {
      // ignore
    }
  }

  // Open a doc from the start screen in the editor (optionally applying its layout), and switch view.
  function openFromStart(next: MindMapDoc, nextLayout?: string) {
    load(next);
    if (nextLayout) changeLayout(nextLayout as LayoutKind);
    setView("editor");
  }
  async function importFromStart(files: File[]) {
    await processFiles(files);
    setView("editor");
  }
  // Return to the start screen, flushing the current map first so Recent reflects the latest edit.
  async function goHome() {
    try {
      await saveMap(liveDocRef.current);
    } catch {
      // best-effort flush
    }
    setView("start");
  }

  // Roll-ups: pull the latest from every roll-up node's source map (the automated cousin of
  // cross-map branch paste). Bind a node via the "⤵ Roll-up" select, then refresh on demand.
  async function refreshRollupsNow() {
    const res = await refreshRollups(liveDocRef.current, loadMap);
    if (res.count === 0) {
      showHint("No roll-ups yet — pick a source map in the ⤵ Roll-up menu first.");
      return;
    }
    load(res.doc);
    const miss = res.missing.length ? ` (${res.missing.length} source map missing)` : "";
    showHint(`Refreshed ${res.count} roll-up${res.count === 1 ? "" : "s"}${miss}.`);
  }

  function duplicateMap() {
    const copy = structuredClone(liveDocRef.current);
    copy.id = crypto.randomUUID();
    copy.title = `${liveDocRef.current.title} (copy)`;
    copy.root = { ...copy.root, topic: copy.title };
    load(copy);
  }

  async function deleteCurrent() {
    // Delete immediately + offer Undo (re-saves the map), instead of a blocking confirm (#9).
    const deleted = structuredClone(liveDocRef.current);
    try {
      await deleteMap(deleted.id);
      sessionCache.current.delete(deleted.id); // its stashed canvas session goes with it
      // Drop its tab and prefer the adjacent open tab; only fall back to the library / a blank map
      // when no other tab is open.
      const neighbour = closeTab(deleted.id);
      let next = neighbour ? await loadMap(neighbour).catch(() => null) : null;
      if (!next) {
        const remaining = await listMaps();
        next = remaining.length > 0 ? await loadMap(remaining[0].id) : null;
      }
      load(next ?? buildTemplate("blank"));
      showToast("info", `Deleted “${deleted.title || "Untitled map"}”`, {
        action: {
          label: "Undo",
          run: async () => {
            try {
              await saveMap(deleted);
              await setLastOpened(deleted.id);
              load(deleted);
            } catch {
              // best-effort restore
            }
          },
        },
        durationMs: 8000,
      });
    } catch {
      // ignore
    }
  }

  // Close a document tab. Flushes the active map first; if it was the active tab, advances to a
  // neighbouring open tab (or the start screen when none remain).
  async function closeMapTab(mapId: string) {
    const wasActive = mapId === doc.id;
    if (wasActive) {
      try {
        await saveMap(liveDocRef.current);
      } catch {
        // best-effort flush
      }
    }
    const neighbour = closeTab(mapId);
    // Drop any stashed canvas session so reopening this map later starts fresh (not a stale viewport
    // + undo stack from before it was closed).
    sessionCache.current.delete(mapId);
    if (!wasActive) return;
    const next = neighbour ? await loadMap(neighbour).catch(() => null) : null;
    if (next) load(next);
    else setView("start");
  }

  const {
    exportJson,
    exportMarkdown,
    exportMermaid,
    exportXmind,
    exportSmmx,
    exportOpml,
    exportFreemind,
    exportPng,
    exportSvg,
    exportHtml,
    exportInteractiveHtml,
    exportDeck,
    exportPdf,
    exportDocx,
    exportPptx,
    exportXlsx,
  } = useMapExports(mapRef, () => liveDocRef.current);

  // Restore the last-opened map on startup straight into the editor. With no prior map (first run /
  // empty library) land on the start screen instead of an editor full of the sample map.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getTabSession().catch(() => null);
      if (cancelled) return;
      if (!session) {
        setView("start");
        return;
      }
      // Prune the open set to maps that still exist (one may have been deleted out-of-band) and seed
      // the library list so the tab titles paint correctly on first render (no "Untitled" flash).
      const lib = await listMaps().catch(() => []);
      if (cancelled) return;
      setMaps(lib);
      const existing = new Set(lib.map((m) => m.id));
      const validIds = session.openTabIds.filter((id) => existing.has(id));
      // Restore the persisted active tab; if its map is gone, fall back to the first surviving tab so
      // a single dead map doesn't drop the whole workspace.
      const activeId = existing.has(session.activeTabId)
        ? session.activeTabId
        : (validIds[0] ?? null);
      const restored = activeId ? await loadMap(activeId).catch(() => null) : null;
      if (cancelled) return;
      if (restored && activeId) {
        restoreSession({
          openTabIds: validIds.length ? validIds : [activeId],
          activeTabId: activeId,
        });
        load(restored);
        setView("editor");
      } else {
        setView("start");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, restoreSession]);

  // A restored canvas session is one-shot: drop it once the (re)mounted canvas has consumed it, so a
  // later in-place remount that keeps the same map id (a version restore bumps restoreRev) starts from
  // a clean session rather than re-applying a stale viewport / undo stack.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the remount inputs (doc.id, restoreRev).
  useEffect(() => {
    sessionCache.current.delete(doc.id);
  }, [doc.id, restoreRev]);

  // Press "/" to jump to the Find box (ignored while typing in a field/node).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const editing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (editing) return;
      e.preventDefault();
      document.querySelector<HTMLInputElement>('input[aria-label="Find node"]')?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Dev-only hooks for browser verification: read the live model, and grab the raw
  // exported SVG straight off the canvas handle (so the export can be rendered outside
  // the app — the Phase F go/no-go check).
  useEffect(() => {
    if (import.meta.env.DEV) {
      const w = window as unknown as {
        __getLiveDoc?: () => MindMapDoc;
        __exportSvg?: () => Promise<string> | null;
      };
      w.__getLiveDoc = () => liveDocRef.current;
      w.__exportSvg = () => mapRef.current?.exportSvg()?.text() ?? null;
    }
  }, []);

  // The native-<dialog> modal mechanic (showModal()/close() + Escape-to-close) now lives in
  // <Dialog>; the three dialogs below pass `open`/`onClose`, with their on-open side effects
  // (focus the first field, lazy-load the searchable library) supplied via `onOpen`.

  // After a cross-map jump, focus the target node once the new map has re-rendered (two
  // frames lets the canvas finish layout + fit). focusNode is a no-op if the id isn't found.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on `doc` so it re-runs when the map switches, though the body reads only the pendingFocus ref.
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => mapRef.current?.focusNode(id)),
    );
    return () => cancelAnimationFrame(raf);
  }, [doc]);

  function goToHit(hit: LibraryHit) {
    setSearchAllOpen(false);
    setLibQuery("");
    if (hit.mapId === liveDocRef.current.id) {
      mapRef.current?.focusNode(hit.nodeId);
    } else {
      pendingFocus.current = hit.nodeId;
      void switchMap(hit.mapId);
    }
  }

  // Keep the current map selectable even before its first save lands.
  const mapOptions = maps.some((m) => m.id === doc.id)
    ? maps
    : [{ id: doc.id, title: doc.title }, ...maps];

  // The toolbar prop groups, built once and shared with both <Toolbar> and the ⌘K command registry
  // (buildEditorCommands) so the two surfaces can't drift — one source of truth for editor actions.
  const toolbarProps: ToolbarProps = {
    isMobile,
    mapRef,
    nav: {
      goHome,
      openAbout: () => setAboutOpen(true),
      openShortcuts: () => setShortcutsOpen(true),
      openSearchAll: () => setSearchAllOpen(true),
      openPaste: () => setPasteOpen(true),
    },
    panels,
    map: {
      doc,
      liveDoc,
      maps,
      mapOptions,
      switchMap,
      load,
      duplicateMap,
      deleteCurrent,
      present: () => setPresentDoc(liveDocRef.current),
      refreshRollupsNow,
    },
    canvas: {
      theme,
      setThemeId,
      layout,
      changeLayout,
      selected,
      setFocus,
      handleImage,
      handleBackgroundImage,
    },
    find: { query, setQuery, replaceWith, setReplaceWith, matchInfo, runSearch, runReplace },
    io: {
      exportJson,
      exportMarkdown,
      exportMermaid,
      exportXmind,
      exportSmmx,
      exportOpml,
      exportFreemind,
      exportPng,
      exportSvg,
      exportHtml,
      exportInteractiveHtml,
      exportDeck,
      exportPdf,
      exportDocx,
      exportPptx,
      exportXlsx,
      exportLibrary,
      copyOutline,
      handleFile,
    },
    history: {
      canUndo,
      canRedo,
      undo: () => {
        mapRef.current?.undo();
        showHint("Undone");
      },
      redo: () => {
        mapRef.current?.redo();
        showHint("Redone");
      },
    },
    showHint,
  };

  if (view === "start") {
    return <StartScreen theme={theme} onOpen={openFromStart} onImportFiles={importFromStart} />;
  }

  return (
    <div className="mm-editor" style={editorThemeVars(theme)}>
      <IconRail
        onHome={goHome}
        onFind={() =>
          document.querySelector<HTMLInputElement>('input[aria-label="Find node"]')?.focus()
        }
        onImage={handleImage}
        onPaste={() => setPasteOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
      />
      <div className="mm-editor-main">
        <Toolbar {...toolbarProps} />

        {openIds.length > 0 && (
          <DocumentTabs
            docs={openIds.map((id) => ({
              id,
              title:
                id === doc.id
                  ? liveDoc.title || doc.title
                  : (maps.find((m) => m.id === id)?.title ?? ""),
            }))}
            activeId={doc.id}
            onActivate={switchMap}
            onClose={closeMapTab}
            onNew={() => load(buildTemplate("blank"))}
          />
        )}

        {error && (
          <div
            role="alert"
            style={{
              padding: "8px 16px",
              background: "#fcebeb",
              color: "#791f1f",
              fontSize: 13,
              borderBottom: "1px solid #f7c1c1",
            }}
          >
            Import failed: {error}
          </div>
        )}

        {warnings.length > 0 && (
          <output
            style={{
              display: "block",
              padding: "8px 16px",
              background: "#faeeda",
              color: "#633806",
              fontSize: 13,
              borderBottom: "1px solid #fac775",
            }}
          >
            Imported with {warnings.length} note{warnings.length > 1 ? "s" : ""}: {warnings[0]}
            {warnings.length > 1 ? ` (+${warnings.length - 1} more)` : ""}
          </output>
        )}

        {toast && (
          <output
            aria-live="polite"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 16px",
              background: toast.kind === "success" ? "#eafaf0" : "#eef2fc",
              color: "#26215c",
              fontSize: 13,
              borderBottom: "1px solid #cecbf6",
            }}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
                style={{ ...controlStyle, padding: "4px 12px" }}
              >
                {toast.action.label}
              </button>
            )}
          </output>
        )}

        {focus && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "4px 12px",
              background: "#efe9ff",
              borderBottom: "1px solid #cecbf6",
              fontSize: 13,
              color: "#26215c",
            }}
          >
            <span>
              ◎ Focusing branch: <strong>{focus.topic || "(untitled)"}</strong>
            </span>
            <button
              type="button"
              onClick={() => setFocus(null)}
              style={{ ...controlStyle, padding: "1px 8px", fontSize: 12 }}
            >
              Show all (Esc)
            </button>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <div className="mm-panel-host">
            {panels.outlineOpen && (
              <OutlinePanel
                root={liveDoc.root}
                filter={outlineFilter}
                numbered={panels.numbered}
                onFilterChange={setOutlineFilter}
                onPick={(id) => mapRef.current?.focusNode(id)}
              />
            )}
            {panels.indexOpen && (
              <MarkerTagIndex
                root={liveDoc.root}
                floatingTopics={liveDoc.floatingTopics}
                onPick={(id) => mapRef.current?.focusNode(id)}
              />
            )}
            {panels.filterOpen && (
              <FilterPanel
                root={liveDoc.root}
                floatingTopics={liveDoc.floatingTopics}
                text={filter.text}
                markers={filter.markers}
                tags={filter.tags}
                due={filter.due}
                priority={filter.priority}
                matchCount={filterHits?.matches ?? 0}
                savedFilters={savedFilters.list}
                onText={filter.setText}
                onToggleMarker={filter.toggleMarker}
                onToggleTag={filter.toggleTag}
                onDue={filter.setDue}
                onPriority={filter.setPriority}
                onClear={filter.clear}
                onSaveFilter={savedFilters.save}
                onApplyFilter={savedFilters.apply}
                onDeleteFilter={savedFilters.remove}
              />
            )}
            {panels.stylesOpen && (
              <StylesPanel
                rules={liveDoc.rules ?? []}
                markers={MARKER_PALETTE}
                namedStyles={namedStyles}
                onAddRule={(rule) => mapRef.current?.setRules([...(liveDoc.rules ?? []), rule])}
                onDeleteRule={(id) =>
                  mapRef.current?.setRules((liveDoc.rules ?? []).filter((r) => r.id !== id))
                }
                onSaveStyle={saveNamedStyle}
                onApplyStyle={(style) => {
                  const ok = mapRef.current?.setSelectedStyle(style);
                  if (!ok) showHint("Select a topic first, then apply a named style.");
                }}
                onDeleteStyle={deleteNamedStyle}
              />
            )}
            {panels.historyOpen && (
              <HistoryPanel
                versions={versions}
                onSaveNow={saveVersionNow}
                onPlay={startPlayback}
                onRestore={restoreVersion}
                onClose={() => panels.setHistoryOpen(false)}
              />
            )}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
              <MindMap
                key={playback ? `pb:${playback.index}` : `${doc.id}:${restoreRev}`}
                ref={mapRef}
                doc={playback ? playback.snaps[playback.index].doc : doc}
                // Restore this tab's stashed viewport + undo/redo on a switch-back (never during
                // history playback). Consumed one-shot by the effect below so a later version-restore
                // remount starts fresh, not from a stale session.
                initialSession={playback ? undefined : sessionCache.current.get(doc.id)}
                theme={theme.theme}
                direction={layout}
                numbered={panels.numbered}
                litIds={playback ? null : litIds}
                onChange={(d) => {
                  if (playback) return; // read-only while reviewing history
                  liveDocRef.current = d;
                  setLiveDoc(d);
                  scheduleSave();
                  if (!firstRunSeen) dismissFirstRun(); // the first edit retires the tips card (#13)
                }}
                onSelect={handleSelect}
                onSelectionCount={setSelectedCount}
                onSelectionFields={setSelectionFields}
                onSelectionMarkerTags={setSelectionMarkerTags}
                onSelectEdge={setSelectedEdge}
                onSelectOverlay={setSelectedOverlay}
                onOpenNote={() => {
                  panels.setInfoMinimized(false);
                  panels.setInfoOpen(true);
                  setNoteNonce((n) => n + 1);
                }}
                onMapLink={(id) => switchMap(id)}
                onHistory={(u, r) => {
                  setCanUndo(u);
                  setCanRedo(r);
                }}
                onDelete={(topic, descendants) => {
                  const detail =
                    descendants > 0
                      ? ` and ${descendants} sub-topic${descendants === 1 ? "" : "s"}`
                      : "";
                  showToast("info", `Deleted “${topic}”${detail}`, {
                    action: { label: "Undo", run: () => mapRef.current?.undo() },
                  });
                }}
              />
              {/* First-run tips (#13) — overlays the canvas for a brand-new user; gone after the
                  first edit or an explicit dismiss. */}
              {!firstRunSeen ? <FirstRunCard onDismiss={dismissFirstRun} /> : null}
              {/* Kanban board overlays the canvas (the map stays mounted underneath). */}
              {panels.boardOpen && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
                  <Kanban
                    doc={liveDoc}
                    onPick={(id) => {
                      panels.setBoardOpen(false);
                      mapRef.current?.focusNode(id);
                    }}
                    onClose={() => panels.setBoardOpen(false)}
                  />
                </div>
              )}
              {/* Version-history timeline playback overlay (the canvas above shows the snapshot). */}
              {playback && (
                <PlaybackBar
                  index={playback.index}
                  count={playback.snaps.length}
                  playing={playback.playing}
                  label={`${playback.index + 1} / ${playback.snaps.length} · ${timeAgo(
                    playback.snaps[playback.index].ts,
                  )}`}
                  onPlayPause={() =>
                    setPlayback((p) =>
                      p ? { ...p, ...togglePlay(p.index, p.snaps.length, p.playing) } : p,
                    )
                  }
                  onStep={(delta) =>
                    setPlayback((p) =>
                      p
                        ? {
                            ...p,
                            index: clampIndex(p.index + delta, p.snaps.length),
                            playing: false,
                          }
                        : p,
                    )
                  }
                  onSeek={(i) =>
                    setPlayback((p) =>
                      p ? { ...p, index: clampIndex(i, p.snaps.length), playing: false } : p,
                    )
                  }
                  onRestore={() => {
                    const id = playback.snaps[playback.index].id;
                    setPlayback(null);
                    void restoreVersion(id);
                  }}
                  onExit={() => setPlayback(null)}
                />
              )}
            </div>
          </div>
          {panels.infoOpen ? (
            selectedEdge ? (
              <EdgeInspector
                edge={selectedEdge}
                fromTopic={edgeTopics.from}
                toTopic={edgeTopics.to}
                width={panels.inspectorWidth}
                onResize={panels.setInspectorWidth}
                onSetLabel={(label) => mapRef.current?.setLinkLabel(label)}
                onSetArrow={(arrow) => mapRef.current?.setLinkArrow(arrow)}
                onSetStyle={(patch) => mapRef.current?.setLinkStyle(patch)}
                onDelete={() => mapRef.current?.deleteLink()}
                onMinimize={() => {
                  panels.setInfoOpen(false);
                  panels.setInfoMinimized(true);
                }}
              />
            ) : selectedOverlay ? (
              <OverlayInspector
                overlay={selectedOverlay}
                caption={overlayCaption}
                width={panels.inspectorWidth}
                onResize={panels.setInspectorWidth}
                onSetLabel={(label) => mapRef.current?.setOverlayLabel(label)}
                onSetColor={(color) => mapRef.current?.setOverlayColor(color)}
                onSetShape={(shape) => mapRef.current?.setOverlayShape(shape)}
                onSetDash={(dash) => mapRef.current?.setOverlayDash(dash)}
                onDelete={() => mapRef.current?.deleteOverlay()}
                onMinimize={() => {
                  panels.setInfoOpen(false);
                  panels.setInfoMinimized(true);
                }}
              />
            ) : selected ? (
              <InfoPanel
                selected={selected}
                selectedCount={selectedCount}
                fields={selectionFields}
                openNoteNonce={noteNonce}
                width={panels.inspectorWidth}
                onResize={panels.setInspectorWidth}
                breadcrumb={inspectorInfo.breadcrumb}
                facts={inspectorInfo.facts}
                times={inspectorInfo.times}
                node={selectedNode}
                noteDraft={noteDraft}
                onNoteChange={onNoteChange}
                onNoteBlur={flushNote}
                markers={MARKER_PALETTE}
                onToggleMarker={(mk) => {
                  const ok = mapRef.current?.toggleSelectedIcon(mk);
                  if (!ok) showHint("Select a node first, then click a marker.");
                }}
                bulkMarkers={selectionMarkerTags?.markers}
                bulkTags={selectionMarkerTags?.tags}
                onBulkToggleMarker={(mk) => mapRef.current?.bulkToggleSelectedIcon(mk)}
                onBulkToggleTag={(t) => mapRef.current?.bulkToggleSelectedTag(t)}
                onPickSticker={(s) => {
                  const ok = mapRef.current?.setSelectedImage(stickerImage(s));
                  if (!ok) showHint("Select a node first, then pick a sticker.");
                }}
                onStyle={(patch) => {
                  const ok = mapRef.current?.setSelectedStyle(patch);
                  if (!ok) showHint("Select a node first, then style it.");
                }}
                onAddTag={(t) => {
                  const cur = selectedNode?.tags ?? [];
                  if (!cur.includes(t)) mapRef.current?.setSelectedTags([...cur, t]);
                }}
                onRemoveTag={(t) =>
                  mapRef.current?.setSelectedTags((selectedNode?.tags ?? []).filter((x) => x !== t))
                }
                onSetProgress={(progress) => {
                  const ok = mapRef.current?.setSelectedProgress(progress);
                  if (!ok) showHint("Select a node first, then set its progress.");
                }}
                onSetDue={(d) => {
                  const ok = mapRef.current?.setSelectedDue(d);
                  if (!ok) showHint("Select a node first, then set a due date.");
                }}
                onSetStart={(d) => {
                  const ok = mapRef.current?.setSelectedStart(d);
                  if (!ok) showHint("Select a node first, then set a start date.");
                }}
                onSetPriority={(p) => {
                  const ok = mapRef.current?.setSelectedPriority(p);
                  if (!ok) showHint("Select a node first, then set its priority.");
                }}
                onAddAttachment={async (file) => {
                  try {
                    const att = await fileToAttachment(file);
                    const ok = mapRef.current?.addSelectedAttachment(att);
                    if (!ok) showHint("Select a node first, then attach a file.");
                  } catch (err) {
                    showHint(err instanceof Error ? err.message : "Could not attach that file.");
                  }
                }}
                onRemoveAttachment={(i) => mapRef.current?.removeSelectedAttachment(i)}
                onSetHyperlink={(url) => {
                  const ok = mapRef.current?.setSelectedHyperlink(url);
                  if (!ok) showHint("Select a node first, then add a link.");
                }}
                maps={maps
                  .filter((mm) => mm.id !== doc.id)
                  .map((mm) => ({ id: mm.id, title: mm.title }))}
                onLinkMap={(mapId) =>
                  mapRef.current?.setSelectedHyperlink(`${MAP_LINK_PREFIX}${mapId}`)
                }
                jumpTargets={outlineRows(liveDoc.root)
                  .filter((r) => r.id !== selected?.id)
                  .map((r) => ({ id: r.id, topic: r.topic, depth: r.depth }))}
                onJump={(id) => mapRef.current?.setSelectedHyperlink(`${NODE_LINK_PREFIX}${id}`)}
                backlinks={backlinks}
                onFollowBacklink={(id) => mapRef.current?.focusNode(id)}
                onMinimize={() => {
                  panels.setInfoOpen(false);
                  panels.setInfoMinimized(true);
                }}
              />
            ) : (
              <MapPanel
                doc={liveDoc}
                theme={theme}
                setThemeId={setThemeId}
                layout={layout}
                changeLayout={changeLayout}
                freeform={liveDoc.meta?.freeform}
                background={liveDoc.meta?.background}
                onSetBackground={(c) => mapRef.current?.setBackground(c)}
                onSetBackgroundImage={(u) => mapRef.current?.setBackgroundImage(u)}
                handleBackgroundImage={handleBackgroundImage}
                lineJumps={!!liveDoc.meta?.lineJumps}
                onToggleLineJumps={() => mapRef.current?.setLineJumps(!liveDoc.meta?.lineJumps)}
                onRenameMap={(t) => mapRef.current?.renameMap(t)}
                onBackdropRings={(d) => mapRef.current?.setBackdropRings(d)}
                onSetBackdropColor={(c) => mapRef.current?.setBackdropColor(c)}
                onClearBackdrop={() => mapRef.current?.clearBackdrop()}
                width={panels.inspectorWidth}
                onResize={panels.setInspectorWidth}
                onMinimize={() => {
                  panels.setInfoOpen(false);
                  panels.setInfoMinimized(true);
                }}
              />
            )
          ) : panels.infoMinimized ? (
            <InspectorRail
              onExpand={() => {
                panels.setInfoMinimized(false);
                panels.setInfoOpen(true);
              }}
            />
          ) : null}
        </div>
      </div>

      {presentDoc && <Presentation doc={presentDoc} onExit={() => setPresentDoc(null)} />}

      {/* Search all maps — controlled <Dialog>; on open, load every map (live current map merged over
          its saved copy) so search sees the latest edits, then focus the query field. */}
      <Dialog
        open={searchAllOpen}
        onClose={() => setSearchAllOpen(false)}
        onOpen={() => {
          (document.querySelector('input[aria-label="Search query"]') as HTMLInputElement)?.focus();
          (async () => {
            const all = await getAllMaps().catch(() => [] as MindMapDoc[]);
            const live = liveDocRef.current;
            setLibDocs([live, ...all.filter((d) => d.id !== live.id)]);
          })();
        }}
        ariaLabel="Search all maps"
        style={{
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          padding: "18px 20px",
          maxWidth: 520,
          width: "calc(100% - 32px)",
          color: "#1f2933",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <strong style={{ fontSize: 15, flex: 1 }}>Search all maps</strong>
          <button
            type="button"
            onClick={() => setSearchAllOpen(false)}
            style={controlStyle}
            aria-label="Close search"
          >
            ✕
          </button>
        </div>
        <input
          value={libQuery}
          onChange={(e) => setLibQuery(e.target.value)}
          placeholder="Find a topic or note across every map…"
          style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
          aria-label="Search query"
        />
        {libQuery.trim() &&
          (() => {
            const hits = searchLibrary(libDocs, libQuery);
            if (hits.length === 0) {
              return (
                <p style={{ color: "#73726c", fontSize: 13, margin: "12px 2px 0" }}>No matches.</p>
              );
            }
            return (
              <ul
                style={{
                  listStyle: "none",
                  margin: "10px 0 0",
                  padding: 0,
                  maxHeight: 320,
                  overflow: "auto",
                }}
              >
                {hits.slice(0, 50).map((h) => (
                  <li key={`${h.mapId}:${h.nodeId}`}>
                    <button
                      type="button"
                      onClick={() => goToHit(h)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        borderRadius: 6,
                        background: "transparent",
                        padding: "6px 8px",
                        cursor: "pointer",
                        font: "inherit",
                      }}
                    >
                      <span>{h.topic}</span>{" "}
                      <span style={{ color: "#9aa5b1", fontSize: 12 }}>— {h.mapTitle}</span>
                    </button>
                  </li>
                ))}
                {hits.length > 50 && (
                  <li style={{ color: "#9aa5b1", fontSize: 12, padding: "6px 8px" }}>
                    +{hits.length - 50} more — refine your search
                  </li>
                )}
              </ul>
            );
          })()}
      </Dialog>

      {/* About — controlled <Dialog>; the browser handles modal semantics, focus trap and Esc. */}
      <Dialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        ariaLabel="About MindMap Studio"
        style={{
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          padding: "22px 24px",
          maxWidth: 440,
          width: "calc(100% - 32px)",
          color: "#1f2933",
          lineHeight: 1.5,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>MindMap Studio</h2>
          <button
            type="button"
            onClick={() => setAboutOpen(false)}
            style={controlStyle}
            aria-label="Close about dialog"
          >
            ✕
          </button>
        </div>
        <p style={{ margin: "8px 0 14px", color: "#52606d", fontSize: 13 }}>
          Local-first mind mapping — a MindManager replacement. Your maps stay in your browser.
        </p>
        <p style={{ margin: "0 0 14px", fontSize: 13 }}>© 2026 Dann Bleeker Pedersen</p>
        <div style={{ fontSize: 13, marginBottom: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>License (dual)</div>
          <div>Software — Apache License 2.0</div>
          <div>Book and docs — CC BY-NC 4.0</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13 }}>
          <a href="/user-guide.html" target="_blank" rel="noopener noreferrer">
            User guide
          </a>
          <a href="/Thinking-in-Maps.pdf" target="_blank" rel="noopener noreferrer">
            Book (PDF)
          </a>
          <a href="/Thinking-in-Maps.epub" target="_blank" rel="noopener noreferrer">
            Book (EPUB)
          </a>
          <a href="/notices.html" target="_blank" rel="noopener noreferrer">
            Third-party notices
          </a>
          <a href="/dashboard.html" target="_blank" rel="noopener noreferrer">
            Live dashboard
          </a>
          <a
            href="https://github.com/dannbleeker/mindmap-studio"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source
          </a>
        </div>
        <div style={{ marginTop: 16, borderTop: "1px solid #e4e4e7", paddingTop: 14 }}>
          <button
            type="button"
            onClick={async () => {
              // Close so the result toast (top of the app) isn't hidden behind the modal.
              setAboutOpen(false);
              const result = await checkForUpdate();
              if (result === "up-to-date") {
                showToast("success", "You're on the latest version.");
              } else if (result === "newly-found") {
                showToast(
                  "info",
                  "New version found — the refresh prompt will appear once it finishes downloading.",
                );
              } else if (result === "unsupported") {
                showToast(
                  "info",
                  "Update checks aren't available here (no service worker running).",
                );
              }
              // 'already-pending' — checkForUpdate already re-surfaced the "Refresh now" prompt.
            }}
            style={controlStyle}
          >
            Check for updates
          </button>
        </div>
      </Dialog>

      {/* Keyboard shortcuts cheat-sheet (#2) — opened from the icon-rail (?) and ⌘K. */}
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Paste text → map — controlled <Dialog>; focus the textarea on open. (No drop shadow here —
          the original Paste dialog had none, so cancel the shared base shadow.) */}
      <Dialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onOpen={() =>
          (
            document.querySelector(
              'textarea[aria-label="Paste outline text"]',
            ) as HTMLTextAreaElement
          )?.focus()
        }
        style={{ padding: 0, width: "min(560px, 92vw)" }}
      >
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <strong style={{ color: "#26215c" }}>Paste text → topics</strong>
          <p style={{ margin: 0, fontSize: 13, color: "#73726c" }}>
            Paste an outline, a bullet list, or Markdown. Indentation (or <code>#</code> headings)
            sets the hierarchy.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"- Theme\n  - Idea\n  - Idea\n- Next theme"}
            aria-label="Paste outline text"
            rows={10}
            style={{
              resize: "vertical",
              border: "1px solid #cecbf6",
              borderRadius: 8,
              padding: 8,
              fontSize: 13,
              fontFamily: "ui-monospace, monospace",
              color: "#26215c",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, color: "#8a8780" }}>
              {countForest(parseOutline(pasteText))} topics
            </span>
            <span style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                style={{ ...controlStyle, background: "#fff" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={pasteUnderSelected}
                disabled={!selected}
                style={controlStyle}
                title={selected ? `Add under "${selected.topic}"` : "Select a node first"}
              >
                ➕ Add under selected
              </button>
              <button type="button" onClick={pasteAsNewMap} style={controlStyle}>
                📋 New map
              </button>
            </span>
          </div>
        </div>
      </Dialog>

      {/* In-editor ⌘K command palette — every toolbar action as a searchable command. */}
      {cmdkOpen && (
        <CommandPalette
          commands={buildEditorCommands(toolbarProps)}
          onClose={() => setCmdkOpen(false)}
          placeholder="Search commands…"
        />
      )}
    </div>
  );
}
