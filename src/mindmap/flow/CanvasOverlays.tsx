import { tNodes } from "../../i18n/nodes";
import { t } from "../../i18n/registry";
import "./messages";
import { MiniMap, NodeToolbar, Panel, Position, useStore } from "@xyflow/react";
import type { CSSProperties } from "react";
import { colors } from "../../design/tokens";
import { markerImage } from "../../icons";
import { buildLegend } from "../../legend";
import type { MindMapDoc } from "../../model/types";
import { findAnyNode } from "./ops";
import type { TopicNode } from "./types";

// Small canvas-only presentational overlays carved out of FlowMindMap's render. None are authored into
// the SVG export, so exports stay unchanged. All take plain props (doc passed in, not via docRef).

/** Empty-map coachmark — anchored under the root via NodeToolbar so it tracks pan/zoom. The keyboard
 *  gestures (Tab / Enter / Shift-drag) don't exist on a phone, so `touch` swaps in the tap equivalents. */
export function CoachMark({
  show,
  rootId,
  touch = false,
}: {
  show: boolean;
  rootId: string;
  touch?: boolean;
}) {
  if (!show) return null;
  return (
    <NodeToolbar nodeId={rootId} isVisible position={Position.Bottom} offset={18}>
      <div className="mm-coachmark nodrag nopan">
        <strong>{t("canvas.startYourMap")}</strong>
        {touch ? (
          <>
            <span>{tNodes("canvas.coach.touchKeys", { add: <kbd>＋</kbd> })}</span>
            <span>{t("app.dragTheBackgroundToPan")}</span>
          </>
        ) : (
          <>
            <span>
              {tNodes("canvas.coach.editKeys", {
                child: <kbd>Tab</kbd>,
                sibling: <kbd>Enter</kbd>,
              })}
            </span>
            <span>{tNodes("canvas.coach.multiSelect", { shift: <kbd>Shift</kbd> })}</span>
          </>
        )}
      </div>
    </NodeToolbar>
  );
}

/** Drag-to-reparent label (#11): names the topic the dragged node will become a child of, anchored on
 *  the highlighted drop target. */
export function DropLabel({ dropTargetId, doc }: { dropTargetId: string | null; doc: MindMapDoc }) {
  if (!dropTargetId) return null;
  // Named `target`, not `t` — `t` is the message lookup imported at the top of this file, and shadowing
  // it here made the label below unmigratable without a silent runtime error.
  const target = findAnyNode(doc, dropTargetId);
  return (
    <NodeToolbar nodeId={dropTargetId} isVisible position={Position.Top} offset={8}>
      <div className="mm-drop-label nodrag nopan">
        {t("canvas.makeChildOf", { topic: target?.topic?.trim() || t("common.topic") })}
      </div>
    </NodeToolbar>
  );
}

/** A slim bottom status bar — visible topic count, current selection size, live zoom % (read from the
 *  React Flow store, so it tracks pan/zoom), and the Map/Outline/Board view switcher. Canvas-only,
 *  like the minimap. */
// A text-as-button inside the status bar (the clickable zoom % / selection-count) — no chrome, just a
// pointer cursor so the read-out doubles as an action.
const statBtn: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  cursor: "pointer",
  padding: 0,
};

const VIEWS: { id: "map" | "outline" | "board"; label: string }[] = [
  { id: "map", label: t("toolbar.map") },
  { id: "outline", label: t("panel.outline") },
  { id: "board", label: t("panel.board") },
];

/** The Map/Outline/Board segmented control — MindManager's status-bar view buttons make these three
 *  shipped projections one-click peers instead of leaving Board buried in the Panels menu. */
function ViewSwitcher({
  active,
  onSet,
}: {
  active: "map" | "outline" | "board";
  onSet: (view: "map" | "outline" | "board") => void;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a toolbar-style button group, not a form <fieldset>.
    <div
      role="group"
      aria-label={t("canvas.switchView")}
      style={{
        display: "flex",
        gap: 2,
        border: `1px solid ${colors.menu.border}`,
        borderRadius: 4,
      }}
    >
      {VIEWS.map((v) => {
        const isActive = active === v.id;
        return (
          <button
            key={v.id}
            type="button"
            aria-pressed={isActive}
            title={t("canvas.switchToView", { view: v.label })}
            onClick={() => onSet(v.id)}
            style={{
              border: "none",
              borderRadius: 3,
              cursor: "pointer",
              font: "inherit",
              fontWeight: isActive ? 600 : 400,
              padding: "1px 6px",
              background: isActive ? "var(--mm-color, #23211c)" : "transparent",
              color: isActive ? "var(--mm-node-bg, #fff)" : "inherit",
            }}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

export function StatusBar({
  topics,
  selected,
  activeView,
  onSetView,
  onResetZoom,
  onFitSelection,
}: {
  topics: number;
  selected: number;
  /** The active Map/Outline/Board projection; the switcher renders only when both this and
   *  `onSetView` are given (a caller can opt out of the switcher entirely). */
  activeView?: "map" | "outline" | "board";
  onSetView?: (view: "map" | "outline" | "board") => void;
  /** Click the zoom % → reset to 100%. */
  onResetZoom?: () => void;
  /** Click the selection count → zoom to fit the selection. */
  onFitSelection?: () => void;
}) {
  const zoom = useStore((s) => s.transform[2]);
  return (
    <Panel position="bottom-center">
      <div
        className="nodrag nopan"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          font: "11px system-ui, sans-serif",
          padding: "2px 10px",
          borderRadius: 6,
          border: `1px solid ${colors.menu.border}`,
          background: `var(--mm-node-bg, ${colors.menu.fallbackBg})`,
          color: `var(--mm-color, ${colors.menu.fallbackColor})`,
          opacity: 0.9,
          boxShadow: "0 1px 3px #0002",
        }}
      >
        {onSetView && activeView ? <ViewSwitcher active={activeView} onSet={onSetView} /> : null}
        <span>{t("canvas.topicCount", { n: topics })}</span>
        {selected > 0 ? (
          onFitSelection ? (
            <button
              type="button"
              style={statBtn}
              title={t("canvas.zoomToFitTheSelection")}
              onClick={onFitSelection}
            >
              {t("canvas.selectedCount", { n: selected })}
            </button>
          ) : (
            <span>{t("canvas.selectedCount", { n: selected })}</span>
          )
        ) : null}
        {onResetZoom ? (
          <button
            type="button"
            style={statBtn}
            title={t("shortcuts.action.resetZoomTo100")}
            onClick={onResetZoom}
          >
            {Math.round(zoom * 100)}%
          </button>
        ) : (
          <span>{Math.round(zoom * 100)}%</span>
        )}
      </div>
    </Panel>
  );
}

/** The map legend (top-left) — every marker / tag / conditional rule in use with its meaning. Shown
 *  when meta.legend is on; the SVG export draws the same rows (from the shared buildLegend). */
export function LegendPanel({ doc }: { doc: MindMapDoc }) {
  const entries = buildLegend(doc);
  if (entries.length === 0) return null;
  return (
    <Panel position="top-left">
      <div
        className="nodrag nopan"
        style={{
          font: "11px system-ui, sans-serif",
          padding: "6px 9px",
          borderRadius: 6,
          border: `1px solid ${colors.menu.border}`,
          background: `var(--mm-node-bg, ${colors.menu.fallbackBg})`,
          color: `var(--mm-color, ${colors.menu.fallbackColor})`,
          maxWidth: 220,
          boxShadow: "0 1px 3px #0002",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4, opacity: 0.7 }}>{t("toolbar.legend")}</div>
        {entries.map((e, i) => (
          <div
            key={`${e.kind}:${e.label}:${i}`}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "1px 0" }}
          >
            {e.kind === "marker" && e.icon ? (
              markerImage(e.icon) ? (
                <img src={markerImage(e.icon) as string} alt="" width={13} height={13} />
              ) : (
                <span style={{ width: 13, textAlign: "center" }}>{e.icon}</span>
              )
            ) : (
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: e.kind === "tag" ? 6 : 2,
                  background: e.color ?? colors.accent,
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {e.label}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** The minimap (when open) + the bottom-right show/hide toggle. */
export function MinimapPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <>
      {open ? (
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => (node.data as TopicNode["data"])?.branchColor ?? "#bbb"}
          nodeStrokeWidth={3}
          style={{ marginBottom: 30 }}
        />
      ) : null}
      <Panel position="bottom-right">
        <button
          type="button"
          onClick={onToggle}
          title={open ? t("canvas.hideMinimap") : t("canvas.showMinimap")}
          style={{
            font: "12px system-ui, sans-serif",
            padding: "2px 8px",
            borderRadius: 6,
            border: `1px solid ${colors.menu.border}`,
            background: `var(--mm-node-bg, ${colors.menu.fallbackBg})`,
            color: `var(--mm-color, ${colors.menu.fallbackColor})`,
            cursor: "pointer",
            boxShadow: "0 1px 3px #0002",
          }}
        >
          {open ? t("canvas.minimap") : t("canvas.minimap2")}
        </button>
      </Panel>
    </>
  );
}
