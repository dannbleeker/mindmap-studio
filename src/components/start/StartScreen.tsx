import { useEffect, useMemo, useState } from "react";
import type { CanvasTheme } from "../../mindmap/theme";
import type { MindMapDoc } from "../../model/types";
import { CommandPalette } from "./CommandPalette";
import { StartHeader } from "./StartHeader";
import { StartHome } from "./StartHome";
import { StartSidebar } from "./StartSidebar";
import { blankDoc } from "./docBuilders";
import { About } from "./sections/About";
import { AllMaps } from "./sections/AllMaps";
import { Examples } from "./sections/Examples";
import { ImportView } from "./sections/ImportView";
import { Layouts } from "./sections/Layouts";
import { Learn } from "./sections/Learn";
import { Recent } from "./sections/Recent";
import { Templates } from "./sections/Templates";
import { startThemeVars } from "./tokens";
import type { StartContext, StartSection } from "./types";
import { useLibrary } from "./useLibrary";
import "./start.css";

const TITLES: Record<StartSection, string> = {
  start: "Start",
  all: "All maps",
  recent: "Recent",
  templates: "Templates",
  examples: "Examples",
  layouts: "Layouts",
  import: "Import",
  learn: "Learn mind mapping",
  about: "About",
};

export function StartScreen({
  theme,
  onOpen,
  onImportFiles,
  onCheckForUpdates,
}: {
  theme: CanvasTheme;
  onOpen: (doc: MindMapDoc, layout?: string) => void;
  onImportFiles: (files: File[]) => void;
  onCheckForUpdates?: () => void;
}) {
  const [section, setSection] = useState<StartSection>("start");
  const [cmdk, setCmdk] = useState(false);
  const [rev, setRev] = useState(0);
  const mapCount = useLibrary(rev).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdk((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ctx: StartContext = useMemo(
    () => ({
      onOpen,
      onImportFiles,
      go: setSection,
      libraryRev: rev,
      onLibraryChange: () => setRev((r) => r + 1),
      onCheckForUpdates,
    }),
    [onOpen, onImportFiles, rev, onCheckForUpdates],
  );

  return (
    <div className="start" style={startThemeVars(theme)}>
      <StartSidebar
        active={section}
        mapCount={mapCount}
        onNavigate={setSection}
        onNewMap={() => onOpen(blankDoc())}
      />
      <div className="st-main">
        <StartHeader title={TITLES[section]} onCommand={() => setCmdk(true)} />
        <div className="st-scroll">
          {section === "start" ? <StartHome ctx={ctx} /> : null}
          {section === "all" ? <AllMaps ctx={ctx} /> : null}
          {section === "recent" ? <Recent ctx={ctx} /> : null}
          {section === "templates" ? <Templates ctx={ctx} /> : null}
          {section === "examples" ? <Examples ctx={ctx} /> : null}
          {section === "layouts" ? <Layouts ctx={ctx} /> : null}
          {section === "import" ? <ImportView ctx={ctx} /> : null}
          {section === "learn" ? <Learn /> : null}
          {section === "about" ? <About onCheckForUpdates={onCheckForUpdates} /> : null}
        </div>
      </div>
      {cmdk ? <CommandPalette ctx={ctx} onClose={() => setCmdk(false)} /> : null}
    </div>
  );
}
