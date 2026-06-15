// Six short principles of mind mapping. Static content.

const PRINCIPLES: { icon: string; title: string; body: string }[] = [
  {
    icon: "◎",
    title: "Start central",
    body: "Put the subject in the middle and grow outward — the centre keeps everything anchored to one idea.",
  },
  {
    icon: "✦",
    title: "One keyword per branch",
    body: "A single word or short phrase per node. It's faster to scan and forces you to distil the thought.",
  },
  {
    icon: "❖",
    title: "Radial hierarchy",
    body: "Main branches near the centre, detail further out. Distance from the centre = level of detail.",
  },
  {
    icon: "🎨",
    title: "Colour by theme",
    body: "Give each main branch its own colour so the eye groups related ideas at a glance.",
  },
  {
    icon: "↔",
    title: "Cross-links",
    body: "Draw a relationship arrow between branches that connect — maps aren't only trees.",
  },
  {
    icon: "⚡",
    title: "Capture, then tidy",
    body: "Get everything down first; rearrange, group, and prune afterwards. Don't edit while you brainstorm.",
  },
];

export function Learn() {
  return (
    <div className="st-content">
      <section>
        <h2 className="st-section-title">Learn mind mapping</h2>
        <p className="st-section-sub">
          A few principles that make maps clearer and faster to think with.
        </p>
      </section>
      <div className="st-principles">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="st-card st-principle">
            <div style={{ fontSize: 22, color: "var(--st-accent)" }} aria-hidden="true">
              {p.icon}
            </div>
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
