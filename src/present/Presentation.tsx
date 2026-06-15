import { useCallback, useEffect, useState } from "react";
import type { MapNode, MindMapDoc } from "../model/types";
import { renderNote } from "../noteFormat";
import { presenterContext } from "./presenter";
import { presentationSlides } from "./slides";

function Bullets({ node }: { node: MapNode }) {
  if (node.children.length === 0) return null;
  return (
    <ul style={{ margin: "0.3em 0", paddingLeft: "1.2em", lineHeight: 1.6 }}>
      {node.children.map((child) => (
        <li key={child.id} style={{ marginBottom: "0.2em" }}>
          {child.topic}
          <Bullets node={child} />
        </li>
      ))}
    </ul>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "#1f1b4d",
  color: "#f5f4ff",
  display: "flex",
  flexDirection: "column",
  font: "16px/1.5 ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

const ctrlStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#f5f4ff",
  border: "1px solid #4a4490",
  background: "#2a2560",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
} as const;

// The presenter-view toggle when it is ON — a brighter, "pressed" variant so the
// presenter can tell at a glance that the sidebar chrome is showing.
const ctrlOnStyle = { ...ctrlStyle, background: "#5a52c0", borderColor: "#7d75e0" } as const;

// Presenter sidebar section heading — small, muted, uppercase label.
const sectionLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#9a93e0",
  margin: "0 0 0.5em",
} as const;

function PresenterSidebar({
  slides,
  index,
  onJump,
}: {
  slides: ReturnType<typeof presentationSlides>;
  index: number;
  onJump: (i: number) => void;
}) {
  const ctx = presenterContext(slides, index);
  return (
    <aside
      aria-label="Presenter view"
      style={{
        width: "clamp(280px, 30vw, 420px)",
        flexShrink: 0,
        borderLeft: "1px solid #4a4490",
        background: "#171339",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        padding: "24px 22px",
        gap: 28,
      }}
    >
      {/* 1. Speaker notes for the current slide. */}
      <section>
        <h2 style={sectionLabelStyle}>Speaker notes</h2>
        {ctx.notes ? (
          <div
            style={{ fontSize: 16, lineHeight: 1.65, color: "#ecebfb" }}
            // Same trusted, sanitised renderer the Notes panel uses (HTML is
            // escaped before the markdown transforms) — no XSS surface here.
            // biome-ignore lint/security/noDangerouslySetInnerHtml: renderNote escapes HTML first.
            dangerouslySetInnerHTML={{ __html: renderNote(ctx.notes) }}
          />
        ) : (
          <p style={{ fontSize: 15, color: "#7e78b8", fontStyle: "italic", margin: 0 }}>
            No notes for this slide.
          </p>
        )}
      </section>

      {/* 2. Peek at what's coming next. */}
      <section>
        <h2 style={sectionLabelStyle}>Next up</h2>
        <p style={{ fontSize: 17, fontWeight: 600, color: "#fff", margin: 0 }}>
          {ctx.nextHeading ?? <span style={{ color: "#7e78b8", fontWeight: 400 }}>End of map</span>}
        </p>
      </section>

      {/* 3. Agenda — the "map" of the talk; current slide highlighted, click to jump. */}
      <section style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <h2 style={sectionLabelStyle}>
          Agenda{" "}
          <span style={{ color: "#6d68a8" }}>
            · {index + 1} / {slides.length}
          </span>
        </h2>
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
          {ctx.agenda.map((item) => (
            <li key={item.index}>
              <button
                type="button"
                onClick={() => onJump(item.index)}
                aria-current={item.current ? "true" : undefined}
                style={{
                  display: "flex",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 10px",
                  fontSize: 14,
                  lineHeight: 1.4,
                  background: item.current ? "#3a3488" : "transparent",
                  color: item.current ? "#fff" : "#c4bff0",
                  fontWeight: item.current ? 700 : 400,
                }}
              >
                <span
                  style={{
                    color: item.current ? "#cfcaf8" : "#6d68a8",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {item.index + 1}
                </span>
                <span
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {item.heading}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

export function Presentation({ doc, onExit }: { doc: MindMapDoc; onExit: () => void }) {
  const slides = presentationSlides(doc);
  const [index, setIndex] = useState(0);
  const [presenter, setPresenter] = useState(false);

  const next = useCallback(
    () => setIndex((i) => Math.min(i + 1, slides.length - 1)),
    [slides.length],
  );
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const togglePresenter = useCallback(() => setPresenter((p) => !p), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onExit();
      else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        togglePresenter();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onExit, togglePresenter]);

  const slide = slides[index];

  return (
    <div style={overlayStyle} aria-label="Presentation">
      {/* The audience slide + the (optional) presenter sidebar share one row, so
          turning on presenter view never changes the slide content itself. */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "48px clamp(24px, 8vw, 120px)",
            maxWidth: 1000,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", margin: "0 0 0.4em", color: "#fff" }}>
            {slide.heading}
          </h1>
          {slide.isOverview ? (
            <ul style={{ fontSize: "clamp(16px, 2.4vw, 24px)", lineHeight: 1.8, color: "#cecbf6" }}>
              {doc.root.children.map((child) => (
                <li key={child.id}>{child.topic}</li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: "clamp(15px, 2vw, 21px)", color: "#e8e6f7" }}>
              <Bullets node={slide.node} />
            </div>
          )}
        </div>

        {presenter && <PresenterSidebar slides={slides} index={index} onJump={setIndex} />}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 20px",
          borderTop: "1px solid #4a4490",
        }}
      >
        <button type="button" onClick={prev} disabled={index === 0} style={ctrlStyle}>
          ‹ Prev
        </button>
        <span style={{ fontSize: 13, color: "#cecbf6" }}>
          {index + 1} / {slides.length}
        </span>
        <button
          type="button"
          onClick={next}
          disabled={index === slides.length - 1}
          style={ctrlStyle}
        >
          Next ›
        </button>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={togglePresenter}
          aria-pressed={presenter}
          title="Toggle presenter view (P)"
          style={presenter ? ctrlOnStyle : ctrlStyle}
        >
          Presenter view (P)
        </button>
        <button type="button" onClick={onExit} style={ctrlStyle}>
          Exit (Esc)
        </button>
      </div>
    </div>
  );
}
