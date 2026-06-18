// First-run "3 things to try" card (#13). A one-time, dismissible overlay for a brand-new user;
// App gates it on a localStorage flag and auto-dismisses it permanently after the first real edit.
// Theme-reactive via the .mm-firstrun* classes (offline-safe — no network, no web fonts).

export function FirstRunCard({ onDismiss }: { onDismiss: () => void }) {
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
        <li>
          <strong>Double-click</strong> a topic to rename it
        </li>
        <li>
          Press <kbd>Tab</kbd> to add a child
        </li>
        <li>
          Press <kbd>Ctrl/⌘ + K</kbd> for anything
        </li>
      </ol>
    </aside>
  );
}
