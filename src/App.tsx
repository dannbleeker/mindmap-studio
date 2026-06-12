import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { fileToMapImage } from "./io/image";
import { parseDoc } from "./io/json";
import { fromMarkdown } from "./io/markdown";
import {
  type LayoutDirection,
  MindMap,
  type MindMapHandle,
  type SelectedNode,
} from "./mindmap/MindMap";
import { canvasThemes } from "./mindmap/theme";
import { sampleDoc } from "./model/sampleMap";
import type { MindMapDoc } from "./model/types";
import { outlineRows } from "./outline";
import { Presentation } from "./present/Presentation";
import {
  type MapSummary,
  deleteMap,
  getLastOpened,
  listMaps,
  loadMap,
  saveMap,
  setLastOpened,
} from "./store/mapStore";
import { useFind } from "./useFind";
import { useMapExports } from "./useMapExports";
import { useTheme } from "./useTheme";

const controlStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#26215c",
  border: "1px solid #cecbf6",
  background: "#eeedfe",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
} as const;

const inputStyle = {
  fontSize: 13,
  color: "#26215c",
  border: "1px solid #cecbf6",
  background: "#fff",
  borderRadius: 8,
  padding: "6px 10px",
  width: 130,
} as const;

function newDoc(): MindMapDoc {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title: "Untitled map",
    root: { id: "root", topic: "Untitled map", children: [] },
    meta: { source: "new" },
  };
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
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [presentDoc, setPresentDoc] = useState<MindMapDoc | null>(null);
  const [hint, setHint] = useState("");
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme, setThemeId } = useTheme();
  const [layout, setLayout] = useState<LayoutDirection>(() => {
    try {
      return (localStorage.getItem("mindmap-layout") as LayoutDirection) || "side";
    } catch {
      return "side";
    }
  });
  const { query, setQuery, matchInfo, runSearch } = useFind(mapRef, () => liveDocRef.current);

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
  const [notesOpen, setNotesOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
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

  function showHint(message: string) {
    setHint(message);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(""), 4000);
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
    const { parseMmap } = await importMmap();
    const result = parseMmap(new Uint8Array(await file.arrayBuffer()));
    return { doc: result.doc, warnings: result.warnings };
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = ""; // allow re-selecting the same files
    if (files.length === 0) return;
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

  async function deleteCurrent() {
    try {
      await deleteMap(liveDocRef.current.id);
      const remaining = await listMaps();
      const next = remaining.length > 0 ? await loadMap(remaining[0].id) : null;
      load(next ?? newDoc());
    } catch {
      // ignore
    }
  }

  const { exportJson, exportMarkdown, exportPng, exportSvg, exportHtml, exportPdf } = useMapExports(
    mapRef,
    () => liveDocRef.current,
  );

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

  // Dev-only hook so the live model can be read during browser verification.
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as unknown as { __getLiveDoc?: () => MindMapDoc }).__getLiveDoc = () =>
        liveDocRef.current;
    }
  }, []);

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
          gap: 8,
          padding: "10px 16px",
          borderBottom: "1px solid #e2e0d8",
        }}
      >
        <strong style={{ fontSize: 15, marginRight: 4 }}>MindMap Studio</strong>
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
        <button type="button" onClick={() => load(newDoc())} style={controlStyle}>
          + New
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
        <form onSubmit={runSearch} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find…"
            aria-label="Find node"
            style={inputStyle}
          />
          {matchInfo && <span style={{ fontSize: 11, color: "#73726c" }}>{matchInfo}</span>}
        </form>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "#73726c" }}>Export</span>
        <button type="button" onClick={exportJson} style={controlStyle}>
          .json
        </button>
        <button type="button" onClick={exportMarkdown} style={controlStyle}>
          .md
        </button>
        <button type="button" onClick={exportPng} style={controlStyle}>
          .png
        </button>
        <button type="button" onClick={exportSvg} style={controlStyle}>
          .svg
        </button>
        <button type="button" onClick={exportHtml} style={controlStyle}>
          .html
        </button>
        <button type="button" onClick={exportPdf} style={controlStyle}>
          .pdf
        </button>
        <label style={controlStyle}>
          Open files
          <input
            id="mmap-input"
            type="file"
            accept=".mmap,.mmp,.md,.markdown,.json"
            multiple
            onChange={handleFile}
            style={{ display: "none" }}
          />
        </label>
      </header>

      {error && (
        <div
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
        <div
          style={{
            padding: "8px 16px",
            background: "#faeeda",
            color: "#633806",
            fontSize: 13,
            borderBottom: "1px solid #fac775",
          }}
        >
          Imported with {warnings.length} note{warnings.length > 1 ? "s" : ""}: {warnings[0]}
          {warnings.length > 1 ? ` (+${warnings.length - 1} more)` : ""}
        </div>
      )}

      {hint && (
        <div
          style={{
            padding: "8px 16px",
            background: "#eef2fc",
            color: "#26215c",
            fontSize: 13,
            borderBottom: "1px solid #cecbf6",
          }}
        >
          {hint}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {outlineOpen && (
          <aside
            style={{
              width: 250,
              flexShrink: 0,
              overflowY: "auto",
              borderRight: "1px solid #e2e0d8",
              background: "#fbfbf9",
              padding: "8px 0",
            }}
          >
            {outlineRows(liveDoc.root).map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => mapRef.current?.focusNode(row.id)}
                title={row.topic}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#26215c",
                  padding: "3px 10px",
                  paddingLeft: 10 + row.depth * 14,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.hasNote ? "📝 " : ""}
                {row.topic || "(untitled)"}
              </button>
            ))}
          </aside>
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
          />
        </div>
      </div>

      {notesOpen && (
        <div
          style={{
            height: 140,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "8px 16px",
            borderTop: "1px solid #e2e0d8",
            background: "#fbfbf9",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
              color: "#73726c",
            }}
          >
            <span>📝 Note{selected ? ` — ${selected.topic}` : ""}</span>
            <button
              type="button"
              onClick={() => setNotesOpen(false)}
              style={{ ...controlStyle, padding: "2px 8px", fontSize: 12 }}
            >
              Close
            </button>
          </div>
          {selected ? (
            <textarea
              value={noteDraft}
              onChange={(e) => onNoteChange(e.target.value)}
              onBlur={flushNote}
              placeholder="Add a note for this node…"
              aria-label="Node note"
              style={{
                flex: 1,
                resize: "none",
                border: "1px solid #cecbf6",
                borderRadius: 8,
                padding: 8,
                fontSize: 13,
                fontFamily: "inherit",
                color: "#26215c",
              }}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                color: "#999",
                fontSize: 13,
              }}
            >
              Select a node to add or edit its note.
            </div>
          )}
        </div>
      )}

      {presentDoc && <Presentation doc={presentDoc} onExit={() => setPresentDoc(null)} />}
    </div>
  );
}
