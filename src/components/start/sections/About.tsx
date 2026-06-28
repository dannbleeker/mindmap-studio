import { InstallButton } from "../../InstallButton";

// Local-first / format-agnostic / open-source blurb, plus the book, user guide, and other resource
// links — mirrors the editor's ⓘ About so the Start screen exposes the same downloads.

const LINKS: { href: string; label: string }[] = [
  { href: "/user-guide.html", label: "User guide" },
  { href: "/Thinking-in-Maps.pdf", label: "Book — Thinking in Maps (PDF)" },
  { href: "/Thinking-in-Maps.epub", label: "Book — Thinking in Maps (EPUB)" },
  { href: "/notices.html", label: "Third-party notices" },
  { href: "/dashboard.html", label: "Live dashboard" },
  { href: "https://github.com/dannbleeker/mindmap-studio", label: "Source" },
];

export function About({ onCheckForUpdates }: { onCheckForUpdates?: () => void }) {
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

      <section>
        <h3 className="st-section-title" style={{ fontSize: 13, color: "var(--st-muted)" }}>
          Read &amp; reference
        </h3>
        <p className="st-section-sub">
          The companion book <strong>Thinking in Maps</strong>, the user guide, and more — each
          opens in a new tab.
        </p>
        <div className="st-card" style={{ padding: 16, marginTop: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {LINKS.map((l) => (
              <a
                key={l.href}
                className="st-link"
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="st-section-title" style={{ fontSize: 13, color: "var(--st-muted)" }}>
          Updates
        </h3>
        <p className="st-section-sub">
          Installed as a PWA, MindMap Studio updates itself; check here to pull a new version now.
        </p>
        <div className="st-card" style={{ padding: 16, marginTop: 10 }}>
          <button type="button" className="st-btn" onClick={() => onCheckForUpdates?.()}>
            Check for updates
          </button>
          {/* Renders only when the browser offers installation (or iOS Safari); otherwise nothing. */}
          <InstallButton className="st-install-about" />
        </div>
      </section>

      <div style={{ fontSize: 12.5, color: "var(--st-muted)", lineHeight: 1.6 }}>
        <div>© 2026 Dann Bleeker Pedersen</div>
        <div>Software — Apache License 2.0 · Book &amp; docs — CC BY-NC 4.0</div>
      </div>
    </div>
  );
}
