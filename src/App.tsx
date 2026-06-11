import { type ChangeEvent, useState } from "react";
import { parseMmap } from "./import/mmap";
import { fromMarkdown, toMarkdown } from "./io/markdown";
import { MindMap } from "./mindmap/MindMap";
import { sampleDoc } from "./model/sampleMap";
import type { MindMapDoc } from "./model/types";

const buttonStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#26215c",
  border: "1px solid #cecbf6",
  background: "#eeedfe",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
} as const;

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
      const name = file.name.toLowerCase();
      if (name.endsWith(".md") || name.endsWith(".markdown")) {
        setDoc(fromMarkdown(await file.text()));
      } else {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { doc: imported, warnings: w } = parseMmap(bytes);
        setDoc(imported);
        setWarnings(w);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function exportMarkdown() {
    const blob = new Blob([toMarkdown(doc)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title || "mindmap"}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
        <button type="button" onClick={exportMarkdown} style={buttonStyle}>
          Export .md
        </button>
        <label style={buttonStyle}>
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
        <MindMap doc={doc} />
      </div>
    </div>
  );
}
