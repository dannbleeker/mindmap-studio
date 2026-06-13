import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { MarkerBar, NotesPanel, OutlinePanel, StyleBar } from "./Panels";
import { buildExample, examples } from "./examples";
import { MARKER_PALETTE } from "./icons";
import { fileToMapImage } from "./io/image";
import { parseDoc } from "./io/json";
import { serializeLibrary, tryParseLibrary } from "./io/library";
import { fromMarkdown, toMarkdown } from "./io/markdown";
import {
  type LayoutDirection,
  MAP_LINK_PREFIX,
  MindMap,
  type MindMapHandle,
  type SelectedNode,
} from "./mindmap/MindMap";
import { canvasThemes } from "./mindmap/theme";
import { sampleDoc } from "./model/sampleMap";
import type { MindMapDoc } from "./model/types";
import { Presentation } from "./present/Presentation";
import {
  type ToastAction,
  type ToastKind,
  type ToastOptions,
  checkForUpdate,
  initPwaUpdateToast,
} from "./pwa/pwaUpdate";
import { type LibraryHit, searchLibrary } from "./search";
import {
  type MapSummary,
  deleteMap,
  getAllMaps,
  getLastOpened,
  listMaps,
  loadMap,
  saveMap,
  setLastOpened,
} from "./store/mapStore";
import { buildTemplate, templates } from "./templates";
import { controlStyle, inputStyle } from "./ui";
import { useFind } from "./useFind";
import { useMapExports } from "./useMapExports";
import { useTheme } from "./useTheme";

export function App() {
  const [doc, setDoc] = useState<MindMapDoc>(sampleDoc);
  // A reactive mirror of the live doc for panels (Outline) — `doc` is only the
  // init prop for MindMap (changes on load), so edits update this without re-init.
  const [liveDoc, setLiveDoc] = useState<MindMapDoc>(sampleDoc);
  const liveDocRef = useRef<MindMapDoc>(sampleDoc);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MindMapHandle>(null);
  const [maps, setMaps] = useState<MapSummary[]>([]);
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
  const [layout, setLayout] = useState<LayoutDirection>(() => {
    try {
      return (localStorage.getItem("mindmap-layout") as LayoutDirection) || "side";
    } catch {
      return "side";
    }
  });
  const { query, setQuery, replaceWith, setReplaceWith, matchInfo, runSearch, runReplace } =
    useFind(mapRef, () => liveDocRef.current);

  function changeLayout(value: LayoutDirection) {
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
  const [notesOpen, setNotesOpen] = useState(!!panels0.notesOpen);
  const [outlineOpen, setOutlineOpen] = useState(!!panels0.outlineOpen);
  const [outlineFilter, setOutlineFilter] = useState("");
  const [markersOpen, setMarkersOpen] = useState(!!panels0.markersOpen);
  const [styleOpen, setStyleOpen] = useState(!!panels0.styleOpen);
  const [aboutOpen, setAboutOpen] = useState(false);
  const aboutRef = useRef<HTMLDialogElement>(null);
  const [searchAllOpen, setSearchAllOpen] = useState(false);
  const [libDocs, setLibDocs] = useState<MindMapDoc[]>([]);
  const [libQuery, setLibQuery] = useState("");
  const searchRef = useRef<HTMLDialogElement>(null);
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
    async (d: MindMapDoc) => {
      try {
        await saveMap(d);
        await setLastOpened(d.id);
        await refreshMaps();
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
    saveTimer.current = setTimeout(() => persist(liveDocRef.current), 500);
  }

  async function parseImport(
    file: File,
    importMmap: () => Promise<typeof import("./import/mmap")>,
  ): Promise<{ doc: MindMapDoc; warnings: string[] }> {
    const name = file.name.toLowerCase();
    if (name.endsWith(".md") || name.endsWith(".markdown")) {
      return { doc: fromMarkdown(await file.text()), warnings: [] };
    }
    if (name.endsWith(".json")) {
      return { doc: parseDoc(await file.text()), warnings: [] };
    }
    if (name.endsWith(".opml")) {
      const { fromOpml } = await import("./io/opml");
      return { doc: fromOpml(await file.text()), warnings: [] };
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

  function duplicateMap() {
    const copy = structuredClone(liveDocRef.current);
    copy.id = crypto.randomUUID();
    copy.title = `${liveDocRef.current.title} (copy)`;
    copy.root = { ...copy.root, topic: copy.title };
    load(copy);
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
    exportOpml,
    exportPng,
    exportSvg,
    exportHtml,
    exportDeck,
    exportPdf,
    exportDocx,
    exportPptx,
    exportXlsx,
  } = useMapExports(mapRef, () => liveDocRef.current);

  // Restore the last-opened map on startup; fall back to the sample.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lastId = await getLastOpened().catch(() => null);
      const restored = lastId ? await loadMap(lastId).catch(() => null) : null;
      if (!cancelled) load(restored ?? sampleDoc);
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

  // Dev-only hook so the live model can be read during browser verification.
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as unknown as { __getLiveDoc?: () => MindMapDoc }).__getLiveDoc = () =>
        liveDocRef.current;
    }
  }, []);

  // Persist the open-panel layout so the workspace is restored next time.
  useEffect(() => {
    try {
      localStorage.setItem(
        "mindmap-panels",
        JSON.stringify({ notesOpen, outlineOpen, markersOpen, styleOpen }),
      );
    } catch {
      // preference is best-effort
    }
  }, [notesOpen, outlineOpen, markersOpen, styleOpen]);

  // Drive the native <dialog> from React state: showModal() gives us the
  // top-layer backdrop, focus handling, and Escape-to-close for free.
  useEffect(() => {
    const el = aboutRef.current;
    if (!el) return;
    if (aboutOpen && !el.open) el.showModal();
    else if (!aboutOpen && el.open) el.close();
  }, [aboutOpen]);

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
  // frames lets mind-elixir finish init + fit). focusNode is a no-op if the id isn't found.
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

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          rowGap: 6,
          padding: "8px 16px",
          borderBottom: "1px solid #e2e0d8",
        }}
      >
        <strong style={{ fontSize: 15, marginRight: 4 }}>MindMap Studio</strong>
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
        <select
          value={layout}
          onChange={(e) => changeLayout(e.target.value as LayoutDirection)}
          style={controlStyle}
          aria-label="Layout direction"
          title="Layout direction"
        >
          <option value="side">Both sides</option>
          <option value="right">Right</option>
          <option value="left">Left</option>
        </select>
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          style={controlStyle}
          aria-pressed={notesOpen}
          title="Show the note editor for the selected node"
        >
          📝 Notes
        </button>
        <button
          type="button"
          onClick={() => setMarkersOpen((v) => !v)}
          style={controlStyle}
          aria-pressed={markersOpen}
          title="Show the marker palette"
        >
          🏷 Markers
        </button>
        <button
          type="button"
          onClick={() => setStyleOpen((v) => !v)}
          style={controlStyle}
          aria-pressed={styleOpen}
          title="Show the style bar (shape, fill, border)"
        >
          🎨 Style
        </button>
        <button
          type="button"
          onClick={() => {
            const id = selected?.id;
            const ok = id ? mapRef.current?.groupBranch(id) : false;
            showHint(
              ok
                ? "Branch grouped — double-click the bracket to rename it."
                : "Select a node first, then group its branch.",
            );
          }}
          style={controlStyle}
          title="Draw a boundary around the selected branch (a visual group)"
        >
          ⬚ Group
        </button>
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            const url = v === "__none__" ? "" : `${MAP_LINK_PREFIX}${v}`;
            const ok = mapRef.current?.setSelectedHyperlink(url);
            showHint(
              !ok
                ? "Select a node first, then link it to a map."
                : v === "__none__"
                  ? "Link removed from the node."
                  : "Node linked — click the 🔗 on it to follow.",
            );
          }}
          style={controlStyle}
          aria-label="Link selected node to a map"
          title="Link the selected node to another map"
        >
          <option value="">🔗 Link…</option>
          {maps
            .filter((m) => m.id !== doc.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          <option value="__none__">✕ Remove link</option>
        </select>
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
              html: exportHtml,
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
          </optgroup>
          <optgroup label="Image">
            <option value="png">.png (image)</option>
            <option value="svg">.svg (vector)</option>
          </optgroup>
          <optgroup label="Document">
            <option value="html">.html (standalone)</option>
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
            accept=".mmap,.mmp,.md,.markdown,.json,.opml"
            multiple
            onChange={handleFile}
            style={{ display: "none" }}
          />
        </label>
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

      {markersOpen && (
        <MarkerBar
          markers={MARKER_PALETTE}
          onToggle={(marker) => {
            const ok = mapRef.current?.toggleSelectedIcon(marker);
            if (!ok) showHint("Select a node first, then click a marker.");
          }}
        />
      )}

      {styleOpen && (
        <StyleBar
          onStyle={(patch) => {
            const ok = mapRef.current?.setSelectedStyle(patch);
            if (!ok) showHint("Select a node first, then style it.");
          }}
        />
      )}

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {outlineOpen && (
          <OutlinePanel
            root={liveDoc.root}
            filter={outlineFilter}
            onFilterChange={setOutlineFilter}
            onPick={(id) => mapRef.current?.focusNode(id)}
          />
        )}
        <div style={{ flex: 1, minHeight: 0 }}>
          <MindMap
            ref={mapRef}
            doc={doc}
            theme={theme.theme}
            direction={layout}
            onChange={(d) => {
              liveDocRef.current = d;
              setLiveDoc(d);
              scheduleSave();
            }}
            onSelect={handleSelect}
            onMapLink={(id) => switchMap(id)}
          />
        </div>
      </div>

      {notesOpen && (
        <NotesPanel
          selected={selected}
          value={noteDraft}
          onChange={onNoteChange}
          onBlur={flushNote}
          onClose={() => setNotesOpen(false)}
        />
      )}

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
    </div>
  );
}
