import type { MindMapDoc } from "../../model/types";
import { MiniMap } from "./MiniMap";
import { branchLabels, docNodeCount } from "./nodeStats";

// A template card: thumbnail + name + COMPUTED node count + branch-preview pills (the first 3 root
// children + "+N"). Everything is derived from the real `build()`-ed doc, so adding a template to
// templates.ts surfaces a correct card with zero extra work.

export function TemplateCard({
  name,
  doc,
  seed,
  onOpen,
}: {
  name: string;
  doc: MindMapDoc;
  seed: string;
  onOpen: () => void;
}) {
  const count = docNodeCount(doc);
  const branches = branchLabels(doc);
  const shown = branches.slice(0, 3);
  const extra = branches.length - shown.length;
  return (
    <button
      type="button"
      className="st-card st-card-hover st-tile"
      onClick={onOpen}
      title={`Open ${name}`}
    >
      <div className="st-thumb">
        <MiniMap seed={seed} />
      </div>
      <div className="st-tile-body">
        <div className="st-card-title">{name}</div>
        <div className="st-card-meta">{count} nodes</div>
        <div className="st-pills">
          {shown.map((b) => (
            <span key={b} className="st-tag">
              {b}
            </span>
          ))}
          {extra > 0 ? <span className="st-tag">+{extra}</span> : null}
        </div>
      </div>
    </button>
  );
}
