import { useEffect, useState } from "react";
import { InstallButton } from "../InstallButton";
import { ACCENT } from "./tokens";
import type { StartSection } from "./types";

// Left rail: brand, primary New-map button, section nav (All maps shows a live count), and the
// "local & private" footer card.

const NAV: { id: StartSection; label: string; icon: string }[] = [
  { id: "start", label: "Start", icon: "✦" },
  { id: "all", label: "All maps", icon: "▦" },
  { id: "recent", label: "Recent", icon: "🕘" },
  { id: "templates", label: "Templates", icon: "▢" },
  { id: "examples", label: "Examples", icon: "✸" },
  { id: "layouts", label: "Layouts", icon: "❖" },
  { id: "import", label: "Import", icon: "⤓" },
  { id: "learn", label: "Learn mind mapping", icon: "✎" },
  { id: "about", label: "About", icon: "ⓘ" },
];

/** A small node-link glyph (a central node forking to two children) in the emerald accent. */
function BrandGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path
        d="M7 11 H13 M13 11 C16 11 16 6 18 6 M13 11 C16 11 16 16 18 16"
        fill="none"
        stroke={ACCENT}
        strokeWidth="1.6"
      />
      <circle cx="5" cy="11" r="3" fill={ACCENT} />
      <circle cx="18.5" cy="6" r="2.2" fill="none" stroke={ACCENT} strokeWidth="1.6" />
      <circle cx="18.5" cy="16" r="2.2" fill="none" stroke={ACCENT} strokeWidth="1.6" />
    </svg>
  );
}

export function StartSidebar({
  active,
  mapCount,
  onNavigate,
  onNewMap,
}: {
  active: StartSection;
  mapCount: number;
  onNavigate: (s: StartSection) => void;
  onNewMap: () => void;
}) {
  // Narrow widths collapse the section nav into a slide-in drawer behind a hamburger; this state is
  // inert on desktop (the drawer styles only apply ≤640px, where the toggle is shown).
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <nav className="st-sidebar" aria-label="Start sections">
      <div className="st-brand">
        <BrandGlyph />
        MindMap Studio
      </div>
      <button type="button" className="st-new" onClick={onNewMap}>
        <span aria-hidden="true">＋</span> New map
      </button>
      <button
        type="button"
        className="st-hamburger"
        aria-label="Sections menu"
        aria-expanded={drawerOpen}
        aria-controls="st-nav-drawer"
        onClick={() => setDrawerOpen((v) => !v)}
      >
        <span aria-hidden="true">☰</span>
      </button>
      {drawerOpen ? (
        <button
          type="button"
          className="st-nav-backdrop"
          aria-label="Close sections menu"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
      <div id="st-nav-drawer" className={`st-nav${drawerOpen ? " is-open" : ""}`}>
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            className="st-nav-item"
            aria-current={active === n.id}
            onClick={() => {
              onNavigate(n.id);
              setDrawerOpen(false);
            }}
          >
            <span className="st-nav-icon" aria-hidden="true">
              {n.icon}
            </span>
            <span>{n.label}</span>
            {n.id === "all" && mapCount > 0 ? (
              <span className="st-nav-count">{mapCount}</span>
            ) : null}
          </button>
        ))}
      </div>
      <InstallButton className="st-install" />
      <div className="st-foot">
        <span aria-hidden="true">🔒</span>
        <span>
          Local &amp; private — runs in your browser, works offline, nothing leaves this device.
        </span>
      </div>
    </nav>
  );
}

export { NAV };
