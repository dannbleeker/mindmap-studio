import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { wrapSvgHtml } from "./io/html";
import { fromMarkdown, toMarkdown } from "./io/markdown";
import { MindMap, type MindMapHandle } from "./mindmap/MindMap";
import { sampleDoc } from "./model/sampleMap";
import type { MindMapDoc } from "./model/types";
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
  const liveDocRef = useRef<MindMapDoc>(sampleDoc);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MindMapHandle>(null);
  const [maps, setMaps] = useState<MapSummary[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [presentDoc, setPresentDoc] = useState<MindMapDoc | null>(null);

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

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    try {
      const name = file.name.toLowerCase();
      let next: MindMapDoc;
      let w: string[] = [];
      if (name.endsWith(".md") || name.endsWith(".markdown")) {
        next = fromMarkdown(await file.text());
      } else {
        // Code-split: the .mmap importer (fast-xml-parser, fflate) loads on demand.
        const { parseMmap } = await import("./import/mmap");
        const result = parseMmap(new Uint8Array(await file.arrayBuffer()));
        next = result.doc;
        w = result.warnings;
      }
      next.id = crypto.randomUUID(); // each import becomes its own library entry
      load(next, w);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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

  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const baseName = () => liveDocRef.current.title || "mindmap";

  function exportMarkdown() {
    download(
      new Blob([toMarkdown(liveDocRef.current)], { type: "text/markdown" }),
      `${baseName()}.md`,
    );
  }

  async function exportPng() {
    const blob = await mapRef.current?.exportPng();
    if (blob) download(blob, `${baseName()}.png`);
  }

  function exportSvg() {
    const blob = mapRef.current?.exportSvg();
    if (blob) download(blob, `${baseName()}.svg`);
  }

  async function exportHtml() {
    const svg = mapRef.current?.exportSvg();
    if (!svg) return;
    const html = wrapSvgHtml(await svg.text(), baseName());
    download(new Blob([html], { type: "text/html" }), `${baseName()}.html`);
  }

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
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "#73726c" }}>Export</span>
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
        <label style={controlStyle}>
          Open file
          <input
            id="mmap-input"
            type="file"
            accept=".mmap,.mmp,.md,.markdown"
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

      <div style={{ flex: 1, minHeight: 0 }}>
        <MindMap
          ref={mapRef}
          doc={doc}
          onChange={(d) => {
            liveDocRef.current = d;
            scheduleSave();
          }}
        />
      </div>

      {presentDoc && <Presentation doc={presentDoc} onExit={() => setPresentDoc(null)} />}
    </div>
  );
}
