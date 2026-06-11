import { type ChangeEvent, useState } from "react";
import { parseMmap } from "./import/mmap";
import { MindMap } from "./mindmap/MindMap";
import { sampleDoc } from "./model/sampleMap";
import type { MindMapDoc } from "./model/types";

export function App() {
  const [doc, setDoc] = useState<MindMapDoc>(sampleDoc);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setError(null);
    setWarnings([]);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { doc: imported, warnings: w } = parseMmap(bytes);
      setDoc(imported);
      setWarnings(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          borderBottom: "1px solid #e2e0d8",
        }}
      >
        <strong style={{ fontSize: 15 }}>MindMap Studio</strong>
        <span style={{ fontSize: 12, color: "#73726c", flex: 1 }}>{doc.title}</span>
        <label
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#26215c",
            border: "1px solid #cecbf6",
            background: "#eeedfe",
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          Open .mmap
          <input
            id="mmap-input"
            type="file"
            accept=".mmap,.mmp"
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
        <MindMap doc={doc} />
      </div>
    </div>
  );
}
