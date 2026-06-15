import { useState } from "react";

// The hero capture card: three segmented tabs that are the three ways into a new map. Presentational
// — the parent (StartHome) turns a topic / outline / blank choice into a real MindMapDoc and opens it.

type Tab = "topic" | "paste" | "blank";

const EXAMPLES = ["Plan a product launch", "Organize my research", "Map the new onboarding"];

const BLANK_LAYOUTS: { kind: string; label: string }[] = [
  { kind: "side", label: "Two-sided" },
  { kind: "org-down", label: "Org chart" },
  { kind: "radial", label: "Radial" },
  { kind: "grid", label: "Grid" },
];

export function CaptureCard({
  onTopic,
  onPaste,
  onBlank,
}: {
  onTopic: (text: string) => void;
  onPaste: (text: string) => void;
  onBlank: (layout?: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("topic");
  const [topic, setTopic] = useState("");
  const [outline, setOutline] = useState("");

  return (
    <section className="st-card st-hero">
      <div className="st-eyebrow">Local-first mind mapping</div>
      <h1>What's on your mind?</h1>
      <p className="st-hero-sub">
        Capture a thought, paste an outline, or open a blank canvas — it all becomes a map you own.
      </p>

      <div className="st-tabs" role="tablist" aria-label="New map">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "topic"}
          className="st-tab"
          onClick={() => setTab("topic")}
        >
          Type a topic
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "paste"}
          className="st-tab"
          onClick={() => setTab("paste")}
        >
          Paste an outline
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "blank"}
          className="st-tab"
          onClick={() => setTab("blank")}
        >
          Blank canvas
        </button>
      </div>

      {tab === "topic" ? (
        <div>
          <div className="st-capture-row">
            <input
              className="st-input"
              placeholder="e.g. Launch plan for Q3"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && topic.trim()) onTopic(topic.trim());
              }}
            />
            <button
              type="button"
              className="st-btn-primary st-btn"
              disabled={!topic.trim()}
              onClick={() => onTopic(topic.trim())}
            >
              Grow the map
            </button>
          </div>
          <div className="st-try">
            <span>Try</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="st-pill" onClick={() => onTopic(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "paste" ? (
        <div>
          <textarea
            className="st-textarea"
            placeholder={
              "Paste an outline — indentation or # levels set the hierarchy:\n\n# Launch\n  Product\n    Beta\n  Marketing"
            }
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
          />
          <div className="st-capture-row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="st-btn-primary st-btn"
              disabled={!outline.trim()}
              onClick={() => onPaste(outline)}
            >
              Turn into a map
            </button>
          </div>
        </div>
      ) : null}

      {tab === "blank" ? (
        <div>
          <p className="st-explain">
            Keyboard-first: <kbd>Enter</kbd> adds a sibling, <kbd>Tab</kbd> adds a child. Pick a
            starting layout (you can switch it any time):
          </p>
          <div className="st-layout-row">
            {BLANK_LAYOUTS.map((l) => (
              <button
                key={l.kind}
                type="button"
                className="st-layout-chip"
                onClick={() => onBlank(l.kind)}
              >
                <span aria-hidden="true" style={{ fontSize: 18, color: "#26215c" }}>
                  ❖
                </span>
                {l.label}
              </button>
            ))}
          </div>
          <button type="button" className="st-btn-primary st-btn" onClick={() => onBlank()}>
            Open canvas
          </button>
        </div>
      ) : null}
    </section>
  );
}
