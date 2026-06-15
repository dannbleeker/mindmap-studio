// Local-first / format-agnostic / open-source blurb. Static.

export function About() {
  return (
    <div className="st-content">
      <section>
        <h2 className="st-section-title">About MindMap Studio</h2>
      </section>
      <div className="st-card" style={{ padding: 20 }}>
        <p className="st-prose">
          <strong>MindMap Studio</strong> is a local-first, offline mind-mapping studio — a
          self-hosted alternative to MindManager. Your maps live in your browser (IndexedDB) and on
          disk; there are no accounts, no servers, and no telemetry. Nothing leaves this device.
        </p>
        <p className="st-prose">
          It's <strong>format-agnostic</strong>: a single canonical model underneath, with importers
          and exporters for MindManager, Markdown, OPML, FreeMind, Mermaid, XMind and more — so your
          work is never locked in. Install it as a PWA to use it fully offline.
        </p>
        <p className="st-prose">Open-source, and a sibling to TP Studio and MECE Studio.</p>
      </div>
    </div>
  );
}
