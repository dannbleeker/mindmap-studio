import { useCallback, useEffect, useState } from "react";
import type { MapNode, MindMapDoc } from "../model/types";
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

export function Presentation({ doc, onExit }: { doc: MindMapDoc; onExit: () => void }) {
  const slides = presentationSlides(doc);
  const [index, setIndex] = useState(0);

  const next = useCallback(
    () => setIndex((i) => Math.min(i + 1, slides.length - 1)),
    [slides.length],
  );
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onExit();
      else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onExit]);

  const slide = slides[index];

  return (
    <div style={overlayStyle} aria-label="Presentation">
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
        <button type="button" onClick={onExit} style={ctrlStyle}>
          Exit (Esc)
        </button>
      </div>
    </div>
  );
}
