import { t } from "../../i18n/registry";
import "./messages";
import { useState } from "react";

// The hero capture card: three segmented tabs that are the three ways into a new map. Presentational
// — the parent (StartHome) turns a topic / outline / blank choice into a real MindMapDoc and opens it.

type Tab = "topic" | "paste" | "blank";

const EXAMPLES = [
  t("start.suggestionLaunch"),
  t("start.organizeMyResearch"),
  t("start.mapTheNewOnboarding"),
];

const BLANK_LAYOUTS: { kind: string; label: string }[] = [
  { kind: "side", label: t("start.twoSided") },
  { kind: "org-down", label: t("start.orgChart") },
  { kind: "radial", label: t("toolbar.layoutGroupRadial") },
  { kind: "grid", label: t("common.grid") },
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
      <div className="st-eyebrow">{t("start.localFirstMindMapping")}</div>
      <h1>{t("start.whatSOnYourMind")}</h1>
      <p className="st-hero-sub">
        Capture a thought, paste an outline, or open a blank canvas — it all becomes a map you own.
      </p>

      <div className="st-tabs" role="tablist" aria-label={t("start.newMap")}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "topic"}
          className="st-tab"
          onClick={() => setTab("topic")}
        >
          {t("start.typeATopic")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "paste"}
          className="st-tab"
          onClick={() => setTab("paste")}
        >
          {t("start.pasteAnOutline")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "blank"}
          className="st-tab"
          onClick={() => setTab("blank")}
        >
          {t("start.blankCanvas")}
        </button>
      </div>

      {tab === "topic" ? (
        <div>
          <div className="st-capture-row">
            <input
              className="st-input"
              placeholder={t("start.eGLaunchPlanFor")}
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
              {t("start.growTheMap")}
            </button>
          </div>
          <div className="st-try">
            <span>{t("start.try")}</span>
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
            placeholder={t("start.pasteAnOutlineIndentationOr")}
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
              {t("start.turnIntoAMap")}
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
            {t("start.openCanvas")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
