import { useState } from "react";
import { DateChip } from "./Chip";
import { ProgressPie } from "./ProgressPie";
import { type BoardColumn, CARD_DND_TYPE, UNTAGGED, boardColumns } from "./board";
import type { MindMapDoc } from "./model/types";
import { isOverdue, todayISO } from "./taskDate";
import { controlStyle } from "./ui";

// A Kanban board: the map's topics grouped into columns by tag. Click a card to jump to that topic on
// the canvas; DRAG a card to another column to re-tag the topic (drop the source tag, add the target
// one — one undoable edit). Rendered in place of the canvas while the board is open; themed via --ed-*
// so it follows the app appearance.

export function Kanban({
  doc,
  onPick,
  onRetag,
  onClose,
}: {
  doc: MindMapDoc;
  /** Focus a topic on the canvas (and close the board). */
  onPick: (id: string) => void;
  /** Re-tag a topic when its card is dropped on another column (id, source tag, target tag). */
  onRetag: (id: string, fromTag: string, toTag: string) => void;
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
        background: "var(--ed-page)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          borderBottom: "1px solid var(--ed-border)",
        }}
      >
        <strong style={{ color: "var(--ed-ink)" }}>▦ Board — topics by tag</strong>
        <button type="button" onClick={onClose} style={controlStyle}>
          ✕ Close board
        </button>
      </div>
      {columns.length === 0 ? (
        <div style={{ padding: 24, color: "var(--ed-muted)", fontSize: 14 }}>
          No topics yet. Add tags to topics (in the ℹ Info panel) to group them into columns here.
        </div>
      ) : (
        <div
          style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", gap: 12, padding: 14 }}
        >
          {columns.map((col) => (
            <Column
              key={col.tag || "__untagged"}
              col={col}
              today={today}
              onPick={onPick}
              onRetag={onRetag}
            />
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
  onRetag,
}: {
  col: BoardColumn;
  today: string;
  onPick: (id: string) => void;
  onRetag: (id: string, fromTag: string, toTag: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: dragOver ? "var(--ed-accent-tint)" : "var(--ed-sidebar)",
        border: `1px solid ${dragOver ? "var(--ed-accent)" : "var(--ed-border)"}`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        transition: "background 0.1s ease, border-color 0.1s ease",
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(CARD_DND_TYPE)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        const raw = e.dataTransfer.getData(CARD_DND_TYPE);
        if (!raw) return;
        e.preventDefault();
        const { id, from } = JSON.parse(raw) as { id: string; from: string };
        if (from !== col.tag) onRetag(id, from, col.tag);
      }}
    >
      <div
        style={{
          padding: "8px 10px",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--ed-ink)",
          borderBottom: "1px solid var(--ed-border)",
        }}
      >
        {col.tag === UNTAGGED ? "Untagged" : `#${col.tag}`}{" "}
        <span style={{ color: "var(--ed-muted)", fontWeight: 400 }}>· {col.cards.length}</span>
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
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  CARD_DND_TYPE,
                  JSON.stringify({ id: card.id, from: col.tag }),
                );
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={() => onPick(card.id)}
              title="Drag to another column to re-tag · click to jump to this topic"
              style={{
                textAlign: "left",
                background: "var(--ed-card)",
                border: "1px solid var(--ed-border)",
                borderRadius: 8,
                padding: "6px 8px",
                cursor: "grab",
                color: "var(--ed-ink)",
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
