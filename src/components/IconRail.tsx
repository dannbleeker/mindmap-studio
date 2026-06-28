import type { ChangeEvent } from "react";
import { BrandMark } from "./BrandMark";
import { EditorIcon } from "./EditorIcons";

// IconRail — the 56px left rail of the redesigned editor. Brand mark returns to the Start screen;
// the utility buttons are wired to real actions only (no decorative tool-mode buttons that would do
// nothing — the canvas's select/pan are React Flow built-ins). Styled via .mm-rail* in editor.css.

export interface IconRailProps {
  onHome: () => void;
  onImage: (event: ChangeEvent<HTMLInputElement>) => void;
  onPaste: () => void;
  onShortcuts: () => void;
  onSettings: () => void;
}

function RailBtn({
  icon,
  label,
  onClick,
}: {
  icon: Parameters<typeof EditorIcon>[0]["name"];
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="mm-rail-btn"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <EditorIcon name={icon} size={19} />
    </button>
  );
}

export function IconRail({ onHome, onImage, onPaste, onShortcuts, onSettings }: IconRailProps) {
  return (
    <aside className="mm-rail">
      <button
        type="button"
        className="mm-rail-btn"
        title="Back to Start — new maps, templates, library"
        aria-label="Back to Start"
        onClick={onHome}
        style={{ width: 40, height: 40, marginBottom: 4 }}
      >
        <BrandMark size={24} />
      </button>
      <span className="mm-rail-sep" />
      <label
        className="mm-rail-btn"
        title="Insert image on the selected node"
        aria-label="Insert image"
      >
        <EditorIcon name="image" size={19} />
        <input type="file" accept="image/*" onChange={onImage} style={{ display: "none" }} />
      </label>
      <RailBtn icon="paste" label="Paste text → topics" onClick={onPaste} />
      <div className="mm-rail-spacer">
        <RailBtn icon="settings" label="Settings" onClick={onSettings} />
        <RailBtn icon="help" label="Keyboard shortcuts" onClick={onShortcuts} />
      </div>
    </aside>
  );
}
