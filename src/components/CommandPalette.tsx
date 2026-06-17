import { useEffect, useMemo, useRef, useState } from "react";

// A generic ⌘K command palette: fuzzy (subsequence) search over a list of commands, arrow-key nav,
// Enter to run, Esc / click-outside to close. The Start screen and the editor both build a
// `Command[]` and render this — the shared substrate behind both palettes. Styled with the existing
// `.st-cmdk*` classes so it looks identical wherever it's used.

export interface Command {
  id: string;
  label: string;
  /** A short category badge shown on the right (e.g. "view", "export", "panel"). */
  kind: string;
  run: () => void;
  /** When false, the command is hidden (e.g. a selection-dependent action with nothing selected). */
  enabled?: boolean;
}

/** Subsequence match (typo-tolerant enough for a small command set). */
function matches(text: string, q: string): boolean {
  if (!q) return true;
  let i = 0;
  for (const ch of text) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

export function CommandPalette({
  commands,
  onClose,
  placeholder = "Search commands…",
  makeQueryCommand,
}: {
  commands: Command[];
  onClose: () => void;
  placeholder?: string;
  /** Optional command derived from the live query, prepended to the list (e.g. "New map: <q>"). */
  makeQueryCommand?: (query: string) => Command | null;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest?.(".st-cmdk")) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  const items = useMemo<Command[]>(() => {
    const query = q.trim().toLowerCase();
    const list = commands.filter(
      (c) => c.enabled !== false && matches(c.label.toLowerCase(), query),
    );
    const qc = makeQueryCommand?.(q.trim());
    if (qc) list.unshift(qc);
    return list;
  }, [q, commands, makeQueryCommand]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset highlight to top when the result set changes.
  useEffect(() => setActive(0), [items.length]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    c.run();
    onClose();
  };

  return (
    <div className="st-cmdk-backdrop">
      <div className="st-cmdk">
        <input
          ref={inputRef}
          className="st-cmdk-input"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(items[active]);
            }
          }}
        />
        <div className="st-cmdk-list">
          {items.length === 0 ? (
            <div className="st-cmdk-empty">No matches.</div>
          ) : (
            items.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="st-cmdk-item"
                data-active={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
              >
                <span>{c.label}</span>
                <span className="st-cmdk-kind">{c.kind}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
