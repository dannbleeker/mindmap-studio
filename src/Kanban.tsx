import { DateChip } from "./Chip";
import { ProgressPie } from "./ProgressPie";
import { type BoardColumn, UNTAGGED, boardColumns } from "./board";
import type { MindMapDoc } from "./model/types";
import { isOverdue, todayISO } from "./taskDate";
import { controlStyle } from "./ui";

// A read-only Kanban board: the map's topics grouped into columns by tag (a visualisation of the
// same data, not task management — cards don't move/write back). Click a card to jump to that topic
// on the canvas. Rendered in place of the canvas while the board is open.

export function Kanban({
  doc,
  onPick,
  onClose,
}: {
  doc: MindMapDoc;
  /** Focus a topic on the canvas (and close the board). */
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const columns = boardColumns(doc);
  const today = todayISO();
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fbfbf9",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          borderBottom: "1px solid #e2e0d8",
        }}
      >
        <strong style={{ color: "#26215c" }}>▦ Board — topics by tag (read-only)</strong>
        <button type="button" onClick={onClose} style={controlStyle}>
          ✕ Close board
        </button>
      </div>
      {columns.length === 0 ? (
        <div style={{ padding: 24, color: "#8a8780", fontSize: 14 }}>
          No topics yet. Add tags to topics (in the ℹ Info panel) to group them into columns here.
        </div>
      ) : (
        <div
          style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", gap: 12, padding: 14 }}
        >
          {columns.map((col) => (
            <Column key={col.tag || "__untagged"} col={col} today={today} onPick={onPick} />
          ))}
        </div>
      )}
    </div>
  );
}

function Column({
  col,
  today,
  onPick,
}: {
  col: BoardColumn;
  today: string;
  onPick: (id: string) => void;
}) {
  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: "#f4f3fb",
        border: "1px solid #e2e0d8",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
      }}
    >
      <div
        style={{
          padding: "8px 10px",
          fontSize: 13,
          fontWeight: 700,
          color: "#26215c",
          borderBottom: "1px solid #e2e0d8",
        }}
      >
        {col.tag === UNTAGGED ? "Untagged" : `#${col.tag}`}{" "}
        <span style={{ color: "#8a8780", fontWeight: 400 }}>· {col.cards.length}</span>
      </div>
      <div
        style={{ overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}
      >
        {col.cards.map((card) => {
          const overdue = isOverdue(
            card.due,
            card.progress === undefined ? undefined : card.progress / 100,
            today,
          );
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onPick(card.id)}
              title="Jump to this topic on the map"
              style={{
                textAlign: "left",
                background: "#fff",
                border: "1px solid #cecbf6",
                borderRadius: 8,
                padding: "6px 8px",
                cursor: "pointer",
                color: "#26215c",
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span>{card.topic || "(untitled)"}</span>
              {card.progress !== undefined || card.due ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  {card.progress !== undefined ? (
                    <ProgressPie fraction={card.progress / 100} size={14} />
                  ) : null}
                  {card.due ? <DateChip due={card.due} overdue={overdue} variant="text" /> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
