import { useEffect, useState } from "react";
import { Button } from "../design/primitives";
import type { Appearance } from "../useAppearance";
import type { ContrastPref } from "../useHighContrast";
import type { MotionPref } from "../useReducedMotion";
import { Dialog } from "./Dialog";

// Settings / Preferences — the one place to see and reset the bits of app state that otherwise live
// invisibly in ~a dozen localStorage keys + the IndexedDB library. Local-first means everything lives
// in this one origin's storage, so a "what's stored / clear it" surface is part of being trustworthy.
// Presentational: every action is a prop App wires to the real handler (theme, first-run flag, recents,
// branch clipboard, full wipe). The storage estimate is read here (best-effort) since it's read-only.

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** App chrome appearance — System / Light / Dark (independent of the canvas theme). */
  appearance: Appearance;
  setAppearance: (a: Appearance) => void;
  /** Motion preference — System (follow the OS) / Reduced / Full. */
  motionPref: MotionPref;
  setMotionPref: (p: MotionPref) => void;
  /** High-contrast preference — System (follow the OS) / High / Normal. */
  contrastPref: ContrastPref;
  setContrastPref: (p: ContrastPref) => void;
  /** Re-show the first-run "3 things to try" card. */
  onReShowGettingStarted: () => void;
  /** Clear the ⌘K most-recently-used list. */
  onClearRecents: () => void;
  /** Clear the cross-map branch clipboard. */
  onClearBranchClipboard: () => void;
  /** Wipe the whole local library + preferences (App confirms + reloads). */
  onClearAllData: () => void;
}

const fmtBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      <div className="mm-map-section-title">{title}</div>
      {children}
    </div>
  );
}

export function SettingsDialog({
  open,
  onClose,
  appearance,
  setAppearance,
  motionPref,
  setMotionPref,
  contrastPref,
  setContrastPref,
  onReShowGettingStarted,
  onClearRecents,
  onClearBranchClipboard,
  onClearAllData,
}: SettingsDialogProps) {
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);

  // Read the local storage estimate when the dialog opens (best-effort — not in every browser/jsdom).
  useEffect(() => {
    if (!open) return;
    let live = true;
    void navigator.storage
      ?.estimate?.()
      .then((e) => {
        if (live && typeof e.usage === "number" && typeof e.quota === "number")
          setStorage({ usage: e.usage, quota: e.quota });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      style={{
        width: "min(440px, 92vw)",
        padding: 20,
        color: "var(--ed-ink)",
        background: "var(--ed-card)",
        boxShadow: "var(--ed-shadow-pop)",
      }}
    >
      <Section title="Appearance">
        <label className="mm-map-field">
          <span>App theme</span>
          <select
            className="mm-map-control"
            value={appearance}
            onChange={(e) => setAppearance(e.target.value as Appearance)}
            aria-label="App theme"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ed-muted)" }}>
          App theme colours the chrome (toolbar, panels, dialogs). The canvas theme (which colours
          the topics) lives in the Map panel, alongside layout and the rest of the map's look — a
          dark canvas always darkens the chrome too.
        </p>
        <label className="mm-map-field">
          <span>Reduce motion</span>
          <select
            className="mm-map-control"
            value={motionPref}
            onChange={(e) => setMotionPref(e.target.value as MotionPref)}
            aria-label="Reduce motion"
          >
            <option value="system">System</option>
            <option value="reduced">On</option>
            <option value="full">Off</option>
          </select>
        </label>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ed-muted)" }}>
          Reduce motion makes canvas zoom/fit and the guided walk instant, and drops chrome
          transitions. System follows your device's reduced-motion setting.
        </p>
        <label className="mm-map-field">
          <span>High contrast</span>
          <select
            className="mm-map-control"
            value={contrastPref}
            onChange={(e) => setContrastPref(e.target.value as ContrastPref)}
            aria-label="High contrast"
          >
            <option value="system">System</option>
            <option value="high">On</option>
            <option value="normal">Off</option>
          </select>
        </label>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ed-muted)" }}>
          High contrast strengthens chrome borders, dividers and text, and adds bolder focus rings.
          System follows your device's contrast / forced-colors setting.
        </p>
      </Section>

      <Section title="Getting started">
        <Button onClick={onReShowGettingStarted} style={{ alignSelf: "flex-start" }}>
          Show the getting-started tips again
        </Button>
      </Section>

      <Section title="Local data">
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--ed-muted)", lineHeight: 1.5 }}>
          Everything — your maps, version history and preferences — is stored only in this browser.
          {storage
            ? ` About ${fmtBytes(storage.usage)} used of ${fmtBytes(storage.quota)} available.`
            : ""}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Button onClick={onClearRecents}>Clear command history</Button>
          <Button onClick={onClearBranchClipboard}>Clear branch clipboard</Button>
        </div>
        <Button
          onClick={onClearAllData}
          style={{
            alignSelf: "flex-start",
            marginTop: 4,
            color: "var(--ed-danger)",
            border: "1px solid var(--ed-danger)",
          }}
        >
          Clear all local data…
        </Button>
      </Section>
    </Dialog>
  );
}
