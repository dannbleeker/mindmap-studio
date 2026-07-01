import type { RefObject } from "react";
import { Button } from "../design/primitives";
import { space } from "../design/tokens";
import type { MindMapHandle } from "../mindmap";
import { findAnyNode, subtreeExportDoc } from "../mindmap/flow/ops";
import type { MindMapDoc } from "../model/types";
import { type MapExports, useMapExports } from "../useMapExports";
import { Dialog } from "./Dialog";

// The "Export this branch…" format picker (B4). Self-contained + lazy-loaded so ALL of the branch-export
// plumbing — a scoped useMapExports instance (subtreeExportDoc keeps the ids + meta; the renderer-backed
// png/svg/html/pdf render just the branch from the live canvas via exportSvg(rootId)) — stays out of the
// entry bundle and only loads once a branch export is chosen. Each button fires the scoped exporter and
// closes.

type BranchIo = Pick<
  MapExports,
  | "exportPng"
  | "exportSvg"
  | "exportHtml"
  | "exportInteractiveHtml"
  | "exportPdf"
  | "exportJson"
  | "exportMarkdown"
>;

const FORMATS: { label: string; run: (io: BranchIo) => void | Promise<void> }[] = [
  { label: "PNG image", run: (io) => io.exportPng() },
  { label: "SVG vector", run: (io) => io.exportSvg() },
  { label: "HTML (standalone picture)", run: (io) => io.exportHtml() },
  { label: "HTML (interactive)", run: (io) => io.exportInteractiveHtml() },
  { label: "PDF (print)", run: (io) => io.exportPdf() },
  { label: ".json (lossless)", run: (io) => io.exportJson() },
  { label: "Markdown", run: (io) => io.exportMarkdown() },
];

export function BranchExportDialog({
  nodeId,
  mapRef,
  getDoc,
  numbered,
  showHint,
  onClose,
}: {
  /** The subtree root to export. */
  nodeId: string;
  mapRef: RefObject<MindMapHandle | null>;
  /** Read the live doc (the scoped getDoc reslices it to the subtree). */
  getDoc: () => MindMapDoc;
  numbered: () => boolean;
  showHint: (msg: string) => void;
  onClose: () => void;
}) {
  const exports = useMapExports(
    mapRef,
    () => subtreeExportDoc(getDoc(), nodeId) ?? getDoc(),
    numbered,
    showHint,
    () => nodeId,
  );
  const branchName = findAnyNode(getDoc(), nodeId)?.topic ?? "";
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Export branch: ${branchName || "(untitled)"}`}
      style={{ width: "min(92vw, 340px)", padding: space.xxl, boxShadow: "var(--ed-shadow-pop)" }}
    >
      <p style={{ margin: `0 0 ${space.lg}px`, color: "var(--ed-muted)", fontSize: 13 }}>
        Export just this topic and everything under it.
      </p>
      <div style={{ display: "grid", gap: space.sm }}>
        {FORMATS.map((f) => (
          <Button
            key={f.label}
            onClick={() => {
              void f.run(exports);
              onClose();
            }}
            style={{ justifyContent: "flex-start", width: "100%" }}
          >
            {f.label}
          </Button>
        ))}
      </div>
    </Dialog>
  );
}
