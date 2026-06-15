// Slim top bar for the start screen: the active section title + a ⌘K command trigger.

const IS_MAC = typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform);

export function StartHeader({ title, onCommand }: { title: string; onCommand: () => void }) {
  return (
    <header className="st-header">
      <h2>{title}</h2>
      <button
        type="button"
        className="st-cmdk-trigger"
        onClick={onCommand}
        aria-label="Search and commands"
      >
        <span>Search & commands</span>
        <span className="st-kbd">{IS_MAC ? "⌘K" : "Ctrl K"}</span>
      </button>
    </header>
  );
}
