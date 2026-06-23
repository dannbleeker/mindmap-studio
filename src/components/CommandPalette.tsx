import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";

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
  /** Extra text folded into the fuzzy match but NOT displayed — e.g. a topic's note, so "jump to a
   *  topic" finds it by note text too. */
  keywords?: string;
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

// A small most-recently-used list (commands + jumped-to topics) so reopening ⌘K surfaces what you
// just did. Best-effort localStorage, like the theme + panel prefs.
const RECENT_KEY = "mindmap-cmdk-recent";
const RECENT_MAX = 5;
function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX)
      : [];
  } catch {
    return [];
  }
}
function pushRecent(id: string) {
  try {
    const next = [id, ...loadRecent().filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // best-effort — recents just don't persist
  }
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
  // Restore focus to whatever opened the palette when it's *cancelled* (Esc / click-outside), so
  // keyboard control isn't dropped to <body>. NOT restored after running a command — a command often
  // moves focus on purpose (opens a dialog, focuses a topic), and we mustn't yank it back.
  const openerRef = useRef<HTMLElement | null>(null);
  const ranRef = useRef(false);
  const listId = useId();
  const optionId = (i: number) => `${listId}-opt-${i}`;

  // Focus management — own effect so the save/restore runs exactly once per open (not on every onClose
  // identity change). Capture the opener + focus the input on mount; restore on a cancel unmount.
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      if (!ranRef.current) openerRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
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

  // Snapshot the recents once per open (they're rewritten on run, but we don't want the list to
  // reshuffle under the cursor mid-session).
  const recentIds = useMemo(() => loadRecent(), []);

  const { items, recentCount } = useMemo<{ items: Command[]; recentCount: number }>(() => {
    const query = q.trim().toLowerCase();
    const enabled = commands.filter((c) => c.enabled !== false);
    if (!query) {
      // Empty query: lead with the recently-used (still present) commands, then the rest.
      const recent = recentIds
        .map((id) => enabled.find((c) => c.id === id))
        .filter((c): c is Command => !!c);
      const recentSet = new Set(recent.map((c) => c.id));
      return {
        items: [...recent, ...enabled.filter((c) => !recentSet.has(c.id))],
        recentCount: recent.length,
      };
    }
    const matched = enabled.filter((c) =>
      matches(`${c.label} ${c.keywords ?? ""}`.toLowerCase(), query),
    );
    const qc = makeQueryCommand?.(q.trim());
    if (qc) matched.unshift(qc);
    return { items: matched, recentCount: 0 };
  }, [q, commands, makeQueryCommand, recentIds]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset highlight to top when the result set changes.
  useEffect(() => setActive(0), [items.length]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    ranRef.current = true; // a command ran — don't restore focus to the opener (the command owns focus now)
    // Record only real registry commands (not the synthetic query-derived one) as recent.
    if (commands.some((x) => x.id === c.id)) pushRecent(c.id);
    c.run();
    onClose();
  };

  const sectionStyle = {
    padding: "7px 12px 3px",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    opacity: 0.5,
  } as const;
  // Visually-hidden live region so screen-reader users hear the result count change as they type.
  const srOnly = {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: 0,
  } as const;

  return (
    <div className="st-cmdk-backdrop" role="presentation">
      <div className="st-cmdk" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={inputRef}
          className="st-cmdk-input"
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={items.length ? optionId(active) : undefined}
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
        <div
          className="st-cmdk-list"
          id={listId}
          role="listbox"
          aria-label="Commands"
          tabIndex={-1}
        >
          {items.length === 0 ? (
            <div className="st-cmdk-empty">No matches.</div>
          ) : (
            items.map((c, i) => (
              <Fragment key={c.id}>
                {recentCount > 0 && i === 0 ? (
                  <div style={sectionStyle} role="presentation">
                    Recent
                  </div>
                ) : null}
                {recentCount > 0 && i === recentCount ? (
                  <div style={sectionStyle} role="presentation">
                    All commands
                  </div>
                ) : null}
                <button
                  type="button"
                  className="st-cmdk-item"
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c)}
                >
                  <span>{c.label}</span>
                  <span className="st-cmdk-kind">{c.kind}</span>
                </button>
              </Fragment>
            ))
          )}
        </div>
        <div aria-live="polite" style={srOnly}>
          {items.length === 0
            ? "No matches"
            : `${items.length} command${items.length === 1 ? "" : "s"}`}
        </div>
      </div>
    </div>
  );
}
