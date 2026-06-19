import { EditorIcon } from "./EditorIcons";

export interface DocTab {
  id: string;
  title: string;
}

interface DocumentTabsProps {
  docs: DocTab[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

/**
 * The open-document tab strip: one tab per open map, the active one underlined in the accent colour.
 * Pure + prop-driven — the open set, persistence, and load/switch logic live in App + the
 * useOpenDocuments registry. Middle-click or the × closes a tab; the + opens a new map.
 */
export function DocumentTabs({ docs, activeId, onActivate, onClose, onNew }: DocumentTabsProps) {
  return (
    <div className="mm-doctabs" role="tablist" aria-label="Open documents">
      <div className="mm-doctabs-scroll">
        {docs.map((d) => {
          const active = d.id === activeId;
          const label = d.title || "Untitled map";
          return (
            <div key={d.id} className="mm-doctab" data-active={active || undefined}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className="mm-doctab-main"
                title={label}
                onClick={() => onActivate(d.id)}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    onClose(d.id);
                  }
                }}
              >
                {label}
              </button>
              <button
                type="button"
                className="mm-doctab-x"
                aria-label={`Close ${label}`}
                onClick={() => onClose(d.id)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="mm-doctab-new"
        aria-label="New document"
        title="New document"
        onClick={onNew}
      >
        <EditorIcon name="plus" size={16} />
      </button>
    </div>
  );
}
