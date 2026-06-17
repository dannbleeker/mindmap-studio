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
import { Dialog } from "./components/Dialog";
import { IconRail } from "./components/IconRail";
import { InspectorRail } from "./components/InspectorRail";
import { MapStats } from "./components/MapStats";
import { Toolbar } from "./components/Toolbar";
import { StartScreen } from "./components/start/StartScreen";
import "./design/editor.css";
import { editorThemeVars } from "./design/tokens";
import { type FilterCriteria, filterResult, focusSet, isFilterActive } from "./filter";
import { clampIndex, nextPlaybackIndex, togglePlay } from "./historyPlayback";
import { usePanels } from "./hooks/usePanels";
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
import { sampleDoc } from "./model/sampleMap";
import type { MapNode, MindMapDoc } from "./model/types";
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
import { buildTemplate } from "./templates";
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
  // How many nodes are selected on the canvas (the inspector switches to bulk mode when >1).
  const [selectedCount, setSelectedCount] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  // Panel open/close + Power-Filter + saved-filter presets (with their localStorage persistence) all
  // live in usePanels; App threads `panels` into <Toolbar> and `filter`/`savedFilters` into the
  // FilterPanel. Auto-numbering (`panels.numbered`) draws hierarchical outline numbers on the canvas.
  const { panels, filter, savedFilters } = usePanels();
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
  // Auto-show the right-side inspector when a node is selected (the redesign's auto-show behaviour).
  // Sticky minimize wins: if the user has collapsed the inspector to its strip, selecting another
  // node does NOT force it back open (selectedNode still updates, so re-expanding shows the new node).
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on selection id; setters are stable.
  useEffect(() => {
    if (selected && !panels.infoMinimized) panels.setInfoOpen(true);
  }, [selected?.id]);
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
  // Version history: a "🕔 History" panel of per-map snapshots (open/close in usePanels). Snapshots
  // are captured on a throttle while editing (in `persist`) + on demand; `restoreRev` forces the
  // canvas to re-init when a version is restored in place (same map id, so the doc.id key wouldn't
  // change otherwise).
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
  const [searchAllOpen, setSearchAllOpen] = useState(false);
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
    : [{ id: doc.id, title: doc.title, sheetGroup: liveDoc.meta?.sheetGroup }, ...maps];

  // Sheets of the current workbook (maps sharing this map's sheetGroup) — the sheet tab strip.
  const currentGroup = liveDoc.meta?.sheetGroup;
  const sheets = currentGroup ? mapOptions.filter((m) => m.sheetGroup === currentGroup) : [];

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
        onAbout={() => setAboutOpen(true)}
      />
      <div className="mm-editor-main">
        <Toolbar
          isMobile={isMobile}
          mapRef={mapRef}
          nav={{
            goHome,
            openAbout: () => setAboutOpen(true),
            openSearchAll: () => setSearchAllOpen(true),
            openPaste: () => setPasteOpen(true),
          }}
          panels={panels}
          map={{
            doc,
            liveDoc,
            maps,
            mapOptions,
            switchMap,
            addSheet,
            load,
            duplicateMap,
            deleteCurrent,
            present: () => setPresentDoc(liveDocRef.current),
            refreshRollupsNow,
          }}
          canvas={{
            theme,
            setThemeId,
            layout,
            changeLayout,
            selected,
            setFocus,
            handleImage,
            handleBackgroundImage,
          }}
          find={{
            query,
            setQuery,
            replaceWith,
            setReplaceWith,
            matchInfo,
            runSearch,
            runReplace,
          }}
          io={{
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
          }}
          showHint={showHint}
        />

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
                numbered={panels.numbered}
                litIds={playback ? null : litIds}
                onChange={(d) => {
                  if (playback) return; // read-only while reviewing history
                  liveDocRef.current = d;
                  setLiveDoc(d);
                  scheduleSave();
                }}
                onSelect={handleSelect}
                onSelectionCount={setSelectedCount}
                onMapLink={(id) => switchMap(id)}
              />
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
            selected ? (
              <InfoPanel
                selected={selected}
                selectedCount={selectedCount}
                node={selectedNode}
                noteDraft={noteDraft}
                onNoteChange={onNoteChange}
                onNoteBlur={flushNote}
                markers={MARKER_PALETTE}
                onToggleMarker={(mk) => {
                  const ok = mapRef.current?.toggleSelectedIcon(mk);
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
                onMinimize={() => {
                  panels.setInfoOpen(false);
                  panels.setInfoMinimized(true);
                }}
              />
            ) : (
              <MapStats
                doc={liveDoc}
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
    </div>
  );
}
