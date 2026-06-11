import { MindMap } from "./mindmap/MindMap";
import { sampleDoc } from "./model/sampleMap";

export function App() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #e2e0d8",
          display: "flex",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <strong style={{ fontSize: 15 }}>MindMap Studio</strong>
        <span style={{ fontSize: 12, color: "#73726c" }}>
          Phase 0 spike · MindManager-style render (mind-elixir core)
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <MindMap doc={sampleDoc} />
      </div>
    </div>
  );
}
