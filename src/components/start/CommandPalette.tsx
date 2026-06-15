import { useEffect, useMemo, useRef, useState } from "react";
import { loadMap } from "../../store/mapStore";
import { blankDoc, topicDoc } from "./docBuilders";
import type { StartContext } from "./types";
import { useLibrary } from "./useLibrary";

// ⌘K palette: fuzzy search over actions + saved maps. Arrow-key nav, Enter to run, Esc / click
// outside to close. A non-empty query that matches nothing offers "New map: <query>".

interface Cmd {
  id: string;
  label: string;
  kind: string;
  run: () => void;
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

export function CommandPalette({ ctx, onClose }: { ctx: StartContext; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const maps = useLibrary(ctx.libraryRev);
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

  const items = useMemo<Cmd[]>(() => {
    const actions: Cmd[] = [
      { id: "new", label: "New blank map", kind: "action", run: () => ctx.onOpen(blankDoc()) },
      { id: "import", label: "Import a file", kind: "action", run: () => ctx.go("import") },
      {
        id: "templates",
        label: "Browse templates",
        kind: "action",
        run: () => ctx.go("templates"),
      },
      { id: "layouts", label: "Browse layouts", kind: "action", run: () => ctx.go("layouts") },
      { id: "learn", label: "Learn mind mapping", kind: "action", run: () => ctx.go("learn") },
    ];
    const mapCmds: Cmd[] = maps.map((m) => ({
      id: `map:${m.id}`,
      label: m.title || "(untitled)",
      kind: "map",
      run: () => {
        loadMap(m.id)
          .then((d) => {
            if (d) ctx.onOpen(d);
          })
          .catch(() => {});
      },
    }));
    const query = q.trim().toLowerCase();
    const list = [...actions, ...mapCmds].filter((c) => matches(c.label.toLowerCase(), query));
    if (query) {
      list.unshift({
        id: "new-topic",
        label: `New map: "${q.trim()}"`,
        kind: "create",
        run: () => ctx.onOpen(topicDoc(q.trim())),
      });
    }
    return list;
  }, [q, maps, ctx]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset highlight to top whenever the result set changes.
  useEffect(() => setActive(0), [items.length]);

  const run = (c: Cmd | undefined) => {
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
          placeholder="Search maps and commands…"
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
