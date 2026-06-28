// First-run "3 things to try" card (#13). A one-time, dismissible overlay for a brand-new user;
// App gates it on a localStorage flag and auto-dismisses it permanently after the first real edit.
// Theme-reactive via the .mm-firstrun* classes (offline-safe — no network, no web fonts).

export function FirstRunCard({ onDismiss }: { onDismiss: () => void }) {
  // A phone/tablet has no Tab key, no reliable double-click, and no Ctrl/⌘+K — telling a touch user
  // to do those three things is useless. Detect a coarse pointer and show gestures that actually work.
  const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  return (
    <aside className="mm-firstrun" aria-label="Getting started">
      <button
        type="button"
        className="mm-firstrun-close"
        aria-label="Dismiss getting-started tips"
        onClick={onDismiss}
      >
        ×
      </button>
      <strong className="mm-firstrun-title">3 things to try</strong>
      <ol className="mm-firstrun-list">
        {touch ? (
          <>
            <li>
              <strong>Tap</strong> a topic to select it
            </li>
            <li>
              Tap the <strong>＋</strong> on a topic to add a child
            </li>
            <li>Drag the background to pan · pinch to zoom</li>
          </>
        ) : (
          <>
            <li>
              <strong>Double-click</strong> a topic to rename it
            </li>
            <li>
              Press <kbd>Tab</kbd> to add a child
            </li>
            <li>
              Press <kbd>Ctrl/⌘ + K</kbd> for anything
            </li>
          </>
        )}
      </ol>
    </aside>
  );
}
