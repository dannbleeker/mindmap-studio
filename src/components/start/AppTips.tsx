// "Learn the app" — four cards teaching editor mechanics (distinct from sections/Learn.tsx, which
// teaches mind-mapping principles). Static, render-only; reuses the .st-principles grid + .st-principle
// card styling from the Learn section so it themes with the rest of the Start screen.

const TIPS: { icon: string; title: string; body: string; action?: "cmdk" }[] = [
  {
    icon: "⌘",
    title: "⌘K for any command",
    body: "Press Ctrl/⌘ + K anywhere to search and run any action.",
    action: "cmdk",
  },
  {
    icon: "✦",
    title: "Right-click a topic",
    body: "Open the context menu for markers, priority, colour and more.",
  },
  {
    icon: "↬",
    title: "Drag a topic's dot to relate",
    body: "Pull from a node's side grip onto another to draw a relationship.",
  },
  {
    icon: "⤓",
    title: "Export to PowerPoint / PDF",
    body: "Share a map as .pptx, PDF, PNG or SVG from the Export menu.",
  },
];

export function AppTips({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) {
  return (
    <section>
      <h2 className="st-section-title">Learn the app</h2>
      <p className="st-section-sub">Four shortcuts that make the editor faster.</p>
      <div className="st-principles" style={{ marginTop: 12 }}>
        {TIPS.map((t) => {
          const inner = (
            <>
              <div style={{ fontSize: 22, color: "var(--st-accent)" }} aria-hidden="true">
                {t.icon}
              </div>
              <h3>{t.title}</h3>
              <p>{t.body}</p>
            </>
          );
          // The ⌘K card opens the palette right here — show, don't just tell. Others stay static.
          if (t.action === "cmdk" && onOpenCommandPalette) {
            return (
              <button
                key={t.title}
                type="button"
                className="st-card st-card-hover st-principle"
                style={{ font: "inherit", textAlign: "left", width: "100%", cursor: "pointer" }}
                aria-label="Open the command palette"
                onClick={onOpenCommandPalette}
              >
                {inner}
              </button>
            );
          }
          return (
            <div key={t.title} className="st-card st-principle">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
