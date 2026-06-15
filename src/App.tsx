import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrainstormTimer } from "./BrainstormTimer";
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
import { StartScreen } from "./components/start/StartScreen";
import { buildExample, examples } from "./examples";
import {
  type DueMode,
  type FilterCriteria,
  type SavedFilter,
  filterResult,
  focusSet,
  isFilterActive,
} from "./filter";
import { clampIndex, nextPlaybackIndex, togglePlay } from "./historyPlayback";
import { MARKER_PALETTE } from "./icons";
import { fileToAttachment } from "./io/attachment";
import { fileToMapImage } from "./io/image";
import { parseDoc } from "./io/json";
import { serializeLibrary, tryParseLibrary } from "./io/library";
import { toMarkdown } from "./io/markdown";
import { parseOutline } from "./io/pasteOutline";
import {
  type LayoutKind,
  MAP_LINK_PREFIX,
  MindMap,
  type MindMapHandle,
  NODE_LINK_PREFIX,
  type SelectedNode,
} from "./mindmap";
import { canvasThemes } from "./mindmap/theme";
import { sampleDoc } from "./model/sampleMap";
import type { BackdropKind, MapNode, MindMapDoc } from "./model/types";
import { outlineRows } from "./outline";
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
  type VersionMeta,
  type VersionSnapshot,
  deleteMap,
  getAllMaps,
  getLastOpened,
  latestVersionDoc,
  listMaps,
  listVersions,
  loadAllVersions,
  loadMap,
  loadVersion,
  saveMap,
  saveVersion,
  setLastOpened,
} from "./store/mapStore";
import { todayISO } from "./taskDate";
import { buildTemplate, templates } from "./templates";
import { controlStyle, inputStyle, timeAgo } from "./ui";
import { useFind } from "./useFind";
import { useIsMobile } from "./useIsMobile";
import { useMapExports } from "./useMapExports";
import { useTheme } from "./useTheme";

// Coalesce rapid edits into roughly one auto-saved version every few minutes per map.
const SNAPSHOT_THROTTLE_MS = 3 * 60 * 1000;

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
  const [noteDraft, setNoteDraft] = useState("");
  // Remember which panels were open last time (workspace layout).
  const panels0 = (() => {
    try {
      return JSON.parse(localStorage.getItem("mindmap-panels") ?? "{}");
    } catch {
      return {};
    }
  })();
  const [outlineOpen, setOutlineOpen] = useState(!!panels0.outlineOpen);
  const [outlineFilter, setOutlineFilter] = useState("");
  const [indexOpen, setIndexOpen] = useState(!!panels0.indexOpen);
  // Unified per-node info panel (note + markers + tags + style + links); replaces the old
  // separate Notes / Markers / Style bars + the Link / Jump toolbar selects.
  const [infoOpen, setInfoOpen] = useState(!!panels0.infoOpen);
  // Auto-numbering: show hierarchical outline numbers (1, 1.2, …) on the canvas + outline.
  const [numbered, setNumbered] = useState(!!panels0.numbered);
  // Read-only Power Filter (session-only — never persisted, so a reload never starts dimmed).
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterMarkers, setFilterMarkers] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterDue, setFilterDue] = useState<DueMode>("");
  const [filterPriority, setFilterPriority] = useState(0);
  const clearFilter = () => {
    setFilterText("");
    setFilterMarkers([]);
    setFilterTags([]);
    setFilterDue("");
    setFilterPriority(0);
  };
  // Toggling the panel off also clears the filter, so dimming can't outlive a visible control.
  const toggleFilter = () =>
    setFilterOpen((open) => {
      if (open) clearFilter();
      return !open;
    });
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  // Saved Power-Filter presets, persisted app-wide (a saved "❗" filter is reusable across maps).
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("mindmap-saved-filters") ?? "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("mindmap-saved-filters", JSON.stringify(savedFilters));
    } catch {
      // preference is best-effort
    }
  }, [savedFilters]);
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
  const saveCurrentFilter = (name: string) => {
    const criteria: FilterCriteria = {
      text: filterText,
      markers: filterMarkers,
      tags: filterTags,
      due: filterDue,
      priority: filterPriority || undefined,
    };
    if (!name.trim() || !isFilterActive(criteria)) return;
    // Replace any existing preset with the same name, then add.
    setSavedFilters((prev) => [
      ...prev.filter((f) => f.name !== name.trim()),
      { id: crypto.randomUUID(), name: name.trim(), criteria },
    ]);
  };
  const applySavedFilter = (criteria: FilterCriteria) => {
    setFilterText(criteria.text);
    setFilterMarkers([...criteria.markers]);
    setFilterTags([...criteria.tags]);
    setFilterDue(criteria.due ?? "");
    setFilterPriority(criteria.priority ?? 0);
  };
  const deleteSavedFilter = (id: string) =>
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
  // Memoised so the canvas only re-dims when the map or the criteria actually change. The
  // criteria object is built inside so the deps stay plain primitives (no per-render object).
  const filterHits = useMemo(() => {
    const criteria: FilterCriteria = {
      text: filterText,
      markers: filterMarkers,
      tags: filterTags,
      due: filterDue,
      priority: filterPriority || undefined,
    };
    if (!filterOpen || !isFilterActive(criteria)) return null;
    return filterResult(liveDoc, criteria, todayISO());
  }, [filterOpen, filterText, filterMarkers, filterTags, filterDue, filterPriority, liveDoc]);
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
  // Version history: a "🕔 History" panel of per-map snapshots. Snapshots are captured on a
  // throttle while editing (in `persist`) + on demand; `restoreRev` forces the canvas to re-init
  // when a version is restored in place (same map id, so the doc.id key wouldn't change otherwise).
  const [historyOpen, setHistoryOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [restoreRev, setRestoreRev] = useState(0);
  // Version-history timeline playback: when non-null, the canvas shows snaps[index]
  // read-only instead of the live doc, stepped/scrubbed via the PlaybackBar.
  const [playback, setPlayback] = useState<{
    snaps: VersionSnapshot[];
    index: number;
    playing: boolean;
  } | null>(null);
  const lastSnapshotByMap = useRef<Map<string, number>>(new Map());
  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutRef = useRef<HTMLDialogElement>(null);
  const [searchAllOpen, setSearchAllOpen] = useState(false);
  const [libDocs, setLibDocs] = useState<MindMapDoc[]>([]);
  const [libQuery, setLibQuery] = useState("");
  const searchRef = useRef<HTMLDialogElement>(null);
  // "Paste text → map": parse a pasted outline into topics, as a new map or under the selection.
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const pasteRef = useRef<HTMLDialogElement>(null);
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

  const persist = useCallback(
    // `snapshot` is true only on edit-driven saves — opening/switching a map shouldn't create a
    // version, or pure reloads would spam the history.
    async (d: MindMapDoc, snapshot = false) => {
      try {
        await saveMap(d);
        await setLastOpened(d.id);
        await refreshMaps();
        // Throttled auto-snapshot for version history (best-effort, never blocks the save).
        const last = lastSnapshotByMap.current.get(d.id) ?? 0;
        if (snapshot && Date.now() - last >= SNAPSHOT_THROTTLE_MS) {
          lastSnapshotByMap.current.set(d.id, Date.now());
          saveVersion(d, Date.now()).catch(() => {});
        }
      } catch {
        // autosave is best-effort
      }
    },
    [refreshMaps],
  );

  const load = useCallback(
    (next: MindMapDoc, nextWarnings: string[] = []) => {
      liveDocRef.current = next;
      setLiveDoc(next);
      setWarnings(nextWarnings);
      setError(null);
      setDoc(next);
      persist(next);
    },
    [persist],
  );

  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(liveDocRef.current, true), 500);
  }

  // --- version history ---
  const refreshVersions = useCallback(async () => {
    try {
      setVersions(await listVersions(liveDocRef.current.id));
    } catch {
      // best-effort
    }
  }, []);

  async function saveVersionNow() {
    const d = liveDocRef.current;
    try {
      const latest = await latestVersionDoc(d.id);
      if (latest && JSON.stringify(latest) === JSON.stringify(d)) {
        showHint("No changes since the last version.");
        return;
      }
      await saveVersion(d, Date.now());
      lastSnapshotByMap.current.set(d.id, Date.now());
      await refreshVersions();
      showHint("Version saved.");
    } catch {
      showHint("Couldn't save a version.");
    }
  }

  async function restoreVersion(id: string) {
    const v = await loadVersion(id);
    if (!v) return;
    if (
      !window.confirm(
        "Restore this version? Your current map is saved to history first, so you can undo.",
      )
    )
      return;
    try {
      await saveVersion(liveDocRef.current, Date.now()); // checkpoint current before replacing
      const next: MindMapDoc = { ...structuredClone(v), id: liveDocRef.current.id };
      liveDocRef.current = next;
      setLiveDoc(next);
      setDoc(next);
      setRestoreRev((r) => r + 1); // remount the canvas (same map id won't otherwise re-init)
      lastSnapshotByMap.current.set(next.id, Date.now());
      await saveMap(next);
      await setLastOpened(next.id);
      await refreshMaps();
      await refreshVersions();
      showHint("Version restored — the previous state is saved in history.");
    } catch {
      showHint("Couldn't restore the version.");
    }
  }

  // --- version-history timeline playback ---
  async function startPlayback() {
    try {
      const snaps = await loadAllVersions(liveDocRef.current.id);
      if (snaps.length < 2) {
        showHint("Save at least two versions to play the timeline.");
        return;
      }
      setPlayback({ snaps, index: 0, playing: true });
    } catch {
      showHint("Couldn't load the history for playback.");
    }
  }

  // Advance one frame per tick while playing; stop at the newest snapshot (don't loop).
  useEffect(() => {
    if (!playback?.playing) return;
    const t = setInterval(() => {
      setPlayback((p) => {
        if (!p) return p;
        const nxt = nextPlaybackIndex(p.index, p.snaps.length);
        return nxt === null ? { ...p, playing: false } : { ...p, index: nxt };
      });
    }, 1100);
    return () => clearInterval(t);
  }, [playback?.playing]);

  // Esc exits playback (matching the presentation overlay).
  useEffect(() => {
    if (!playback) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlayback(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playback]);

  // Refresh the history list whenever the panel opens.
  useEffect(() => {
    if (historyOpen) refreshVersions();
  }, [historyOpen, refreshVersions]);

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

  // Multiple sheets per file: maps sharing meta.sheetGroup are sheets of one workbook.
  async function addSheet() {
    const cur = liveDocRef.current;
    const promoted = !cur.meta?.sheetGroup; // a standalone map becomes sheet 1 of a new workbook
    const group = cur.meta?.sheetGroup ?? crypto.randomUUID();
    if (promoted) {
      const tagged: MindMapDoc = { ...cur, meta: { ...cur.meta, sheetGroup: group } };
      liveDocRef.current = tagged;
      setLiveDoc(tagged);
      setDoc(tagged);
      await saveMap(tagged);
    }
    // +1 for the new sheet, +1 more if we just promoted the current map (not yet in `maps`).
    const count = maps.filter((m) => m.sheetGroup === group).length + (promoted ? 2 : 1);
    const sheet = buildTemplate("blank");
    sheet.title = `Sheet ${count}`;
    sheet.root = { ...sheet.root, topic: sheet.title };
    sheet.meta = { ...sheet.meta, sheetGroup: group };
    load(sheet);
  }

  async function exportWorkbook() {
    const group = liveDocRef.current.meta?.sheetGroup;
    if (!group) return;
    try {
      await saveMap(liveDocRef.current); // flush current edits into the workbook
      const sheets: MindMapDoc[] = [];
      for (const s of maps.filter((m) => m.sheetGroup === group)) {
        const d = await loadMap(s.id);
        if (d) sheets.push(d);
      }
      downloadBlob(
        new Blob([serializeLibrary(sheets)], { type: "application/json" }),
        "mindmap-workbook.json",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function deleteCurrent() {
    try {
      await deleteMap(liveDocRef.current.id);
      const remaining = await listMaps();
      const next = remaining.length > 0 ? await loadMap(remaining[0].id) : null;
      load(next ?? buildTemplate("blank"));
    } catch {
      // ignore
    }
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
      const lastId = await getLastOpened().catch(() => null);
      const restored = lastId ? await loadMap(lastId).catch(() => null) : null;
      if (cancelled) return;
      if (restored) {
        load(restored);
        setView("editor");
      } else {
        setView("start");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

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

  // Persist the open-panel layout so the workspace is restored next time.
  useEffect(() => {
    try {
      localStorage.setItem(
        "mindmap-panels",
        JSON.stringify({ outlineOpen, indexOpen, infoOpen, numbered }),
      );
    } catch {
      // preference is best-effort
    }
  }, [outlineOpen, indexOpen, infoOpen, numbered]);

  // Drive the native <dialog> from React state: showModal() gives us the
  // top-layer backdrop, focus handling, and Escape-to-close for free.
  useEffect(() => {
    const el = aboutRef.current;
    if (!el) return;
    if (aboutOpen && !el.open) el.showModal();
    else if (!aboutOpen && el.open) el.close();
  }, [aboutOpen]);

  // "Paste text" dialog (same native-<dialog> pattern).
  useEffect(() => {
    const el = pasteRef.current;
    if (!el) return;
    if (pasteOpen && !el.open) {
      el.showModal();
      el.querySelector("textarea")?.focus();
    } else if (!pasteOpen && el.open) {
      el.close();
    }
  }, [pasteOpen]);

  // Library-wide search dialog (same native-<dialog> pattern). On open, load every map
  // — with the live current map merged over its saved copy — so search sees latest edits.
  useEffect(() => {
    const el = searchRef.current;
    if (!el) return;
    if (searchAllOpen && !el.open) {
      el.showModal();
      el.querySelector("input")?.focus();
      (async () => {
        const all = await getAllMaps().catch(() => [] as MindMapDoc[]);
        const live = liveDocRef.current;
        setLibDocs([live, ...all.filter((d) => d.id !== live.id)]);
      })();
    } else if (!searchAllOpen && el.open) {
      el.close();
    }
  }, [searchAllOpen]);

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
    : [{ id: doc.id, title: doc.title, sheetGroup: liveDoc.meta?.sheetGroup }, ...maps];

  // Sheets of the current workbook (maps sharing this map's sheetGroup) — the sheet tab strip.
  const currentGroup = liveDoc.meta?.sheetGroup;
  const sheets = currentGroup ? mapOptions.filter((m) => m.sheetGroup === currentGroup) : [];

  if (view === "start") {
    return <StartScreen theme={theme} onOpen={openFromStart} onImportFiles={importFromStart} />;
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: isMobile ? "nowrap" : "wrap",
          gap: 6,
          rowGap: 6,
          padding: isMobile ? "6px 10px" : "8px 16px",
          borderBottom: "1px solid #e2e0d8",
          ...(isMobile ? { overflowX: "auto" as const } : {}),
        }}
      >
        <strong style={{ fontSize: 15, marginRight: 4 }}>MindMap Studio</strong>
        <button
          type="button"
          onClick={goHome}
          style={controlStyle}
          title="Start screen — new maps, templates, library"
        >
          ⌂ Start
        </button>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          style={controlStyle}
          title="About MindMap Studio — version, license, credits"
        >
          About
        </button>
        <button
          type="button"
          onClick={() => setSearchAllOpen(true)}
          style={controlStyle}
          title="Search across every map in your library"
        >
          🔎 All maps
        </button>
        <button
          type="button"
          onClick={() => setOutlineOpen((v) => !v)}
          style={controlStyle}
          aria-pressed={outlineOpen}
          title="Toggle the outline panel"
        >
          ☰ Outline
        </button>
        <button
          type="button"
          onClick={() => setIndexOpen((v) => !v)}
          style={controlStyle}
          aria-pressed={indexOpen}
          title="Toggle the markers & tags index"
        >
          📑 Index
        </button>
        <button
          type="button"
          onClick={toggleFilter}
          style={controlStyle}
          aria-pressed={filterOpen}
          title="Power Filter: dim topics that don't match a marker / tag / text (read-only)"
        >
          🎚 Filter
        </button>
        <button
          type="button"
          onClick={() => setStylesOpen((v) => !v)}
          style={controlStyle}
          aria-pressed={stylesOpen}
          title="Conditional formatting — auto-style topics by tag / marker / completion"
        >
          🎨 Styles
        </button>
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          style={controlStyle}
          aria-pressed={historyOpen}
          title="Version history — restore an earlier snapshot of this map"
        >
          🕔 History
        </button>
        <button
          type="button"
          onClick={() => setBoardOpen((v) => !v)}
          style={controlStyle}
          aria-pressed={boardOpen}
          title="Board view — topics grouped into columns by tag (read-only)"
        >
          ▦ Board
        </button>
        <select
          value={doc.id}
          onChange={(e) => switchMap(e.target.value)}
          style={controlStyle}
          aria-label="Open map"
        >
          {mapOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addSheet}
          style={controlStyle}
          title="Add a sheet to this file (maps in a workbook share a sheet tab strip + export together)"
        >
          ▦ + Sheet
        </button>
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) load(v.startsWith("ex:") ? buildExample(v.slice(3)) : buildTemplate(v));
          }}
          style={controlStyle}
          aria-label="New map from a template or example"
          title="New map (pick a blank template or a worked example)"
        >
          <option value="">+ New…</option>
          <optgroup label="Templates">
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Examples">
            {examples.map((e) => (
              <option key={e.id} value={`ex:${e.id}`}>
                {e.name}
              </option>
            ))}
          </optgroup>
        </select>
        <button
          type="button"
          onClick={duplicateMap}
          style={controlStyle}
          title="Duplicate the current map"
        >
          Duplicate
        </button>
        <button type="button" onClick={deleteCurrent} style={controlStyle}>
          Delete
        </button>
        <button
          type="button"
          onClick={() => setPresentDoc(liveDocRef.current)}
          style={controlStyle}
        >
          ▶ Present
        </button>
        <button type="button" onClick={() => mapRef.current?.fit()} style={controlStyle}>
          Fit
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.setAllExpanded(false)}
          style={controlStyle}
          aria-label="Collapse all branches"
          title="Collapse all branches"
        >
          ⊟
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.setAllExpanded(true)}
          style={controlStyle}
          aria-label="Expand all branches"
          title="Expand all branches"
        >
          ⊞
        </button>
        <button
          type="button"
          onClick={() => setNumbered((v) => !v)}
          style={controlStyle}
          aria-pressed={numbered}
          title="Toggle outline numbering (1, 1.2, 1.2.3 …) on topics"
        >
          1. Numbering
        </button>
        <button
          type="button"
          onClick={() => selected && setFocus({ id: selected.id, topic: selected.topic })}
          style={controlStyle}
          disabled={!selected}
          title="Focus the selected branch — dim everything off it (Esc to exit)"
        >
          ◎ Focus
        </button>
        <label style={controlStyle}>
          Image
          <input type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
        </label>
        <select
          value={theme.id}
          onChange={(e) => setThemeId(e.target.value)}
          style={controlStyle}
          aria-label="Canvas theme"
          title="Canvas style / theme"
        >
          {canvasThemes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span
          style={{ ...controlStyle, display: "inline-flex", alignItems: "center", gap: 4 }}
          title="Canvas background colour for this map (overrides the theme)"
        >
          Canvas
          <input
            type="color"
            aria-label="Canvas background colour"
            value={liveDoc.meta?.background || "#ffffff"}
            onChange={(e) => mapRef.current?.setBackground(e.target.value)}
            style={{
              width: 22,
              height: 18,
              border: "none",
              background: "none",
              padding: 0,
              cursor: "pointer",
            }}
          />
          <button
            type="button"
            onClick={() => mapRef.current?.setBackground("")}
            title="Reset background to the theme default"
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#73726c",
              fontSize: 12,
              padding: 0,
            }}
          >
            ✕
          </button>
          <label
            title="Set a background image for this map (covers the canvas, behind the topics)"
            style={{ cursor: "pointer", fontSize: 13, lineHeight: 1 }}
          >
            🖼
            <input
              type="file"
              accept="image/*"
              aria-label="Canvas background image"
              onChange={handleBackgroundImage}
              style={{ display: "none" }}
            />
          </label>
          {liveDoc.meta?.backgroundImage ? (
            <button
              type="button"
              onClick={() => mapRef.current?.setBackgroundImage("")}
              title="Remove the background image"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#73726c",
                fontSize: 12,
                padding: 0,
              }}
            >
              ✕
            </button>
          ) : null}
        </span>
        <select
          value={layout}
          onChange={(e) => changeLayout(e.target.value as LayoutKind)}
          style={controlStyle}
          aria-label="Layout"
          title={liveDoc.meta?.freeform ? "Auto-layout is paused (Free layout is on)" : "Layout"}
          disabled={!!liveDoc.meta?.freeform}
        >
          <optgroup label="Radial">
            <option value="side">Both sides</option>
            <option value="right">Right</option>
            <option value="left">Left</option>
            <option value="radial">Radial / hub</option>
          </optgroup>
          <optgroup label="Tree">
            <option value="org-down">Org chart ↓</option>
            <option value="org-up">Org chart ↑</option>
          </optgroup>
          <optgroup label="Diagram">
            <option value="timeline">Timeline</option>
            <option value="fishbone">Fishbone</option>
            <option value="grid">Grid / matrix</option>
            <option value="brace">Brace map</option>
          </optgroup>
        </select>
        <button
          type="button"
          onClick={() => mapRef.current?.setFreeform(!liveDoc.meta?.freeform)}
          style={controlStyle}
          aria-pressed={!!liveDoc.meta?.freeform}
          title="Free layout (whiteboard): drag topics anywhere; the auto-layout pauses"
        >
          🧲 Free layout
        </button>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) mapRef.current?.setBackdrop(e.target.value as BackdropKind);
          }}
          style={controlStyle}
          aria-label="Add a diagram backdrop"
          title="Add a diagram backdrop (drop topics into its regions)"
        >
          <option value="">◎ Diagram…</option>
          <option value="onion">Onion (rings)</option>
          <option value="funnel">Funnel (stages)</option>
          <option value="venn2">Venn (2 circles)</option>
          <option value="venn3">Venn (3 circles)</option>
        </select>
        {liveDoc.backdrop ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            {liveDoc.backdrop.kind === "onion" || liveDoc.backdrop.kind === "funnel" ? (
              <>
                <button
                  type="button"
                  onClick={() => mapRef.current?.setBackdropRings(-1)}
                  style={controlStyle}
                  title="Fewer rings / stages"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => mapRef.current?.setBackdropRings(1)}
                  style={controlStyle}
                  title="More rings / stages"
                >
                  +
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => mapRef.current?.clearBackdrop()}
              style={controlStyle}
              title="Remove the diagram backdrop"
            >
              ✕ Backdrop
            </button>
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          style={controlStyle}
          aria-pressed={infoOpen}
          title="Topic info: note, markers, tags, style, and links for the selected node"
        >
          ℹ Info
        </button>
        <button
          type="button"
          onClick={() => {
            const id = selected?.id;
            const ok = id ? mapRef.current?.groupBranch(id) : false;
            showHint(
              ok
                ? "Branch grouped — double-click the boundary's label chip to rename it."
                : "Select a node first, then group its branch.",
            );
          }}
          style={controlStyle}
          title="Draw a boundary around the selected branch (a visual group)"
        >
          ⬚ Group
        </button>
        <button
          type="button"
          onClick={() => {
            const id = selected?.id;
            const ok = id ? mapRef.current?.groupSummary(id) : false;
            showHint(
              ok
                ? "Summary added — double-click its label to rename (or empty it to remove)."
                : "Select a node first, then summarise its branch.",
            );
          }}
          style={controlStyle}
          title="Add a labelled summary bracket beside the selected branch"
        >
          ⊐ Summary
        </button>
        <button
          type="button"
          onClick={() => {
            mapRef.current?.addStickyNote();
            showHint("Sticky note added — a free-floating topic you can drag anywhere.");
          }}
          style={controlStyle}
          title="Add a sticky note (a free-floating amber note topic)"
        >
          🗒 Note
        </button>
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            const ok = selected?.id
              ? mapRef.current?.setSelectedRollup(v === "none" ? "" : v)
              : false;
            if (!ok) {
              showHint("Select a node first, then bind it to a roll-up source.");
              return;
            }
            showHint(
              v === "none" ? "Roll-up unbound." : "Bound — click 🔄 Roll-ups to pull the latest.",
            );
          }}
          style={controlStyle}
          title="Mirror another map's branches under the selected node (a roll-up source)"
        >
          <option value="">⤵ Roll-up…</option>
          {maps
            .filter((m) => m.id !== liveDoc.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.title || "(untitled)"}
              </option>
            ))}
          <option value="none">— Unbind</option>
        </select>
        <button
          type="button"
          onClick={refreshRollupsNow}
          style={controlStyle}
          title="Refresh all roll-ups — pull the latest branches from their source maps"
        >
          🔄 Roll-ups
        </button>
        <form onSubmit={runSearch} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find…"
            aria-label="Find node"
            style={{ ...inputStyle, width: 100 }}
          />
          <input
            value={replaceWith}
            onChange={(e) => setReplaceWith(e.target.value)}
            placeholder="Replace…"
            aria-label="Replace with"
            style={{ ...inputStyle, width: 100 }}
          />
          <button
            type="button"
            onClick={runReplace}
            style={{ ...controlStyle, padding: "6px 8px" }}
            title="Replace the find text in every matching topic"
          >
            Replace all
          </button>
          {matchInfo && <span style={{ fontSize: 11, color: "#73726c" }}>{matchInfo}</span>}
        </form>
        <span style={{ width: 1, height: 22, background: "#e2e0d8", margin: "0 2px" }} />
        <select
          value=""
          onChange={(e) => {
            const fn = {
              json: exportJson,
              md: exportMarkdown,
              opml: exportOpml,
              png: exportPng,
              svg: exportSvg,
              mermaid: exportMermaid,
              mm: exportFreemind,
              xmind: exportXmind,
              smmx: exportSmmx,
              html: exportHtml,
              ihtml: exportInteractiveHtml,
              deck: exportDeck,
              pdf: exportPdf,
              docx: exportDocx,
              pptx: exportPptx,
              xlsx: exportXlsx,
            }[e.target.value];
            fn?.();
          }}
          style={controlStyle}
          aria-label="Export the map"
          title="Export the map"
        >
          <option value="">⬆ Export…</option>
          <optgroup label="Data &amp; outline">
            <option value="json">.json (lossless)</option>
            <option value="md">.md (Markdown)</option>
            <option value="opml">.opml (outline)</option>
            <option value="mm">.mm (FreeMind/Freeplane)</option>
            <option value="mermaid">.mmd (Mermaid)</option>
            <option value="xmind">.xmind (XMind)</option>
            <option value="smmx">.smmx (SimpleMind)</option>
          </optgroup>
          <optgroup label="Image">
            <option value="png">.png (image)</option>
            <option value="svg">.svg (vector)</option>
          </optgroup>
          <optgroup label="Document">
            <option value="html">.html (standalone)</option>
            <option value="ihtml">.html (interactive)</option>
            <option value="pdf">.pdf (print)</option>
            <option value="docx">.docx (Word)</option>
            <option value="xlsx">.xlsx (Excel)</option>
          </optgroup>
          <optgroup label="Presentation">
            <option value="deck">.html (slide deck)</option>
            <option value="pptx">.pptx (PowerPoint)</option>
          </optgroup>
        </select>
        <button
          type="button"
          onClick={exportLibrary}
          style={controlStyle}
          title="Back up every map to one .json file (restore by opening it)"
        >
          ⬇ Backup
        </button>
        <button
          type="button"
          onClick={copyOutline}
          style={controlStyle}
          title="Copy the map as a Markdown outline to the clipboard"
        >
          ⧉ Copy outline
        </button>
        <label style={controlStyle}>
          Open files
          <input
            id="mmap-input"
            type="file"
            accept=".mmap,.mmp,.md,.markdown,.json,.opml,.mm,.mmd,.mermaid,.xmind,.smmx,.docx,.xlsx,.itmz,.mind,.mup,.textpack,.textbundle"
            multiple
            onChange={handleFile}
            style={{ display: "none" }}
          />
        </label>
        <button
          type="button"
          onClick={() => setPasteOpen(true)}
          style={controlStyle}
          title="Paste an outline, bullet list, or Markdown and turn it into topics"
        >
          📋 Paste text
        </button>
        <input
          placeholder="Quick add… ⏎"
          aria-label="Quick add topic"
          title="Type a topic and press Enter to add it under the selected node (or the central topic). Keeps focus for rapid capture."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = e.currentTarget.value.trim();
              if (v) {
                mapRef.current?.quickAdd(v);
                e.currentTarget.value = "";
              }
            }
          }}
          style={{ ...inputStyle, width: 130 }}
        />
        <BrainstormTimer />
      </header>

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
          {outlineOpen && (
            <OutlinePanel
              root={liveDoc.root}
              filter={outlineFilter}
              numbered={numbered}
              onFilterChange={setOutlineFilter}
              onPick={(id) => mapRef.current?.focusNode(id)}
            />
          )}
          {indexOpen && (
            <MarkerTagIndex
              root={liveDoc.root}
              floatingTopics={liveDoc.floatingTopics}
              onPick={(id) => mapRef.current?.focusNode(id)}
            />
          )}
          {filterOpen && (
            <FilterPanel
              root={liveDoc.root}
              floatingTopics={liveDoc.floatingTopics}
              text={filterText}
              markers={filterMarkers}
              tags={filterTags}
              due={filterDue}
              priority={filterPriority}
              matchCount={filterHits?.matches ?? 0}
              savedFilters={savedFilters}
              onText={setFilterText}
              onToggleMarker={(m) => setFilterMarkers((list) => toggle(list, m))}
              onToggleTag={(t) => setFilterTags((list) => toggle(list, t))}
              onDue={setFilterDue}
              onPriority={setFilterPriority}
              onClear={clearFilter}
              onSaveFilter={saveCurrentFilter}
              onApplyFilter={applySavedFilter}
              onDeleteFilter={deleteSavedFilter}
            />
          )}
          {stylesOpen && (
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
          {infoOpen && (
            <InfoPanel
              selected={selected}
              node={selectedNode}
              noteDraft={noteDraft}
              onNoteChange={onNoteChange}
              onNoteBlur={flushNote}
              markers={MARKER_PALETTE}
              onToggleMarker={(m) => {
                const ok = mapRef.current?.toggleSelectedIcon(m);
                if (!ok) showHint("Select a node first, then click a marker.");
              }}
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
              maps={maps.filter((m) => m.id !== doc.id).map((m) => ({ id: m.id, title: m.title }))}
              onLinkMap={(mapId) =>
                mapRef.current?.setSelectedHyperlink(`${MAP_LINK_PREFIX}${mapId}`)
              }
              jumpTargets={outlineRows(liveDoc.root)
                .filter((r) => r.id !== selected?.id)
                .map((r) => ({ id: r.id, topic: r.topic, depth: r.depth }))}
              onJump={(id) => mapRef.current?.setSelectedHyperlink(`${NODE_LINK_PREFIX}${id}`)}
              onClose={() => setInfoOpen(false)}
            />
          )}
          {historyOpen && (
            <HistoryPanel
              versions={versions}
              onSaveNow={saveVersionNow}
              onPlay={startPlayback}
              onRestore={restoreVersion}
              onClose={() => setHistoryOpen(false)}
            />
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {sheets.length > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 12px",
                background: "#f4f3fb",
                borderBottom: "1px solid #e2e0d8",
                overflowX: "auto",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8a8780", marginRight: 2 }}>
                SHEETS
              </span>
              {sheets.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => switchMap(s.id)}
                  aria-pressed={s.id === doc.id}
                  style={{
                    ...controlStyle,
                    padding: "2px 10px",
                    fontWeight: s.id === doc.id ? 700 : 400,
                    background: s.id === doc.id ? "#fff" : "transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.title || "(untitled)"}
                </button>
              ))}
              <button
                type="button"
                onClick={addSheet}
                style={{ ...controlStyle, padding: "2px 8px" }}
                title="Add a sheet"
              >
                ＋
              </button>
              <button
                type="button"
                onClick={exportWorkbook}
                style={{ ...controlStyle, padding: "2px 8px", marginLeft: "auto" }}
                title="Export this workbook (all sheets) as one .json"
              >
                ⤓ Workbook
              </button>
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            <MindMap
              key={playback ? `pb:${playback.index}` : `${doc.id}:${restoreRev}`}
              ref={mapRef}
              doc={playback ? playback.snaps[playback.index].doc : doc}
              theme={theme.theme}
              direction={layout}
              numbered={numbered}
              litIds={playback ? null : litIds}
              onChange={(d) => {
                if (playback) return; // read-only while reviewing history
                liveDocRef.current = d;
                setLiveDoc(d);
                scheduleSave();
              }}
              onSelect={handleSelect}
              onMapLink={(id) => switchMap(id)}
            />
            {/* Kanban board overlays the canvas (the map stays mounted underneath). */}
            {boardOpen && (
              <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
                <Kanban
                  doc={liveDoc}
                  onPick={(id) => {
                    setBoardOpen(false);
                    mapRef.current?.focusNode(id);
                  }}
                  onClose={() => setBoardOpen(false)}
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
                      ? { ...p, index: clampIndex(p.index + delta, p.snaps.length), playing: false }
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
      </div>

      {presentDoc && <Presentation doc={presentDoc} onExit={() => setPresentDoc(null)} />}

      {/* Search all maps — native <dialog>, same modal semantics as About. */}
      <dialog
        ref={searchRef}
        aria-label="Search all maps"
        onClose={() => setSearchAllOpen(false)}
        style={{
          border: "none",
          borderRadius: 12,
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
      </dialog>

      {/* About — native <dialog>: modal semantics, focus trap and Esc handled by the browser. */}
      <dialog
        ref={aboutRef}
        aria-label="About MindMap Studio"
        onClose={() => setAboutOpen(false)}
        style={{
          border: "none",
          borderRadius: 12,
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
      </dialog>

      {/* Paste text → map — native <dialog>, same modal semantics as About. */}
      <dialog
        ref={pasteRef}
        onClose={() => setPasteOpen(false)}
        style={{ border: "none", borderRadius: 12, padding: 0, width: "min(560px, 92vw)" }}
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
      </dialog>
    </div>
  );
}
