import { useMemo } from "react";
import { loadMap } from "../../store/mapStore";
import { type Command, CommandPalette as Palette } from "../CommandPalette";
import { blankDoc, topicDoc } from "./docBuilders";
import type { StartContext } from "./types";
import { useLibrary } from "./useLibrary";

// The Start screen's ⌘K palette: actions + saved maps, plus a "New map: <query>" affordance for a
// non-matching query. A thin builder over the shared CommandPalette (../CommandPalette).

export function CommandPalette({ ctx, onClose }: { ctx: StartContext; onClose: () => void }) {
  const maps = useLibrary(ctx.libraryRev);

  const commands = useMemo<Command[]>(() => {
    const actions: Command[] = [
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
    const mapCmds: Command[] = maps.map((m) => ({
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
    return [...actions, ...mapCmds];
  }, [maps, ctx]);

  return (
    <Palette
      commands={commands}
      onClose={onClose}
      placeholder="Search maps and commands…"
      makeQueryCommand={(query) =>
        query
          ? {
              id: "new-topic",
              label: `New map: "${query}"`,
              kind: "create",
              run: () => ctx.onOpen(topicDoc(query)),
            }
          : null
      }
    />
  );
}
