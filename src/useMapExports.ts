import type { RefObject } from "react";
import { downloadBlob } from "./io/download";
import { buildPrintDoc, wrapSvgHtml } from "./io/html";
import { serializeDoc } from "./io/json";
import { toMarkdown } from "./io/markdown";
import { toMermaid } from "./io/mermaid";
import { buildNotesAppendix } from "./io/notesAppendix";
import { sanitizeSvg } from "./io/svgSanitize";
import type { MindMapHandle } from "./mindmap";
import type { MindMapDoc } from "./model/types";
import { outlineNumbers } from "./outline";

// Rasterise an SVG string to a PNG via an offscreen canvas. Safe because the exporter emits
// native <text> (no foreignObject) — a foreignObject SVG would taint the canvas, which is
// exactly why an HTML-in-SVG export path produces a blank/broken image.
async function svgToPng(svg: string): Promise<Blob | null> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1;
    canvas.height = img.naturalHeight || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface MapExports {
  exportJson: () => void;
  exportMarkdown: () => void;
  exportMermaid: () => void;
  exportOpml: () => Promise<void>;
  exportFreemind: () => Promise<void>;
  exportXmind: () => Promise<void>;
  exportSmmx: () => Promise<void>;
  exportMmap: () => Promise<void>;
  exportPng: () => Promise<void>;
  exportSvg: () => Promise<void>;
  exportHtml: () => Promise<void>;
  exportInteractiveHtml: () => Promise<void>;
  exportDeck: () => Promise<void>;
  exportPdf: () => Promise<void>;
  exportDocx: () => Promise<void>;
  exportPptx: () => Promise<void>;
  exportXlsx: () => Promise<void>;
}

// Download handlers for every export format, kept out of App so the component
// isn't dominated by I/O plumbing. Renderer-backed formats (png/svg/html/pdf) go
// through the MindMap ref; model-backed ones (json/md) read the current doc.
export function useMapExports(
  mapRef: RefObject<MindMapHandle | null>,
  getDoc: () => MindMapDoc,
  /** When true, the Markdown export bakes in outline numbers (mirrors the on-screen numbering). */
  numbered?: () => boolean,
  /** Surface a one-line hint (toast) — used when an image/PDF export has no live canvas to render. */
  onHint?: (msg: string) => void,
): MapExports {
  const baseName = () => getDoc().title || "mindmap";
  // The renderer-backed formats (png/svg/html/pdf) need a live canvas; when there isn't one (e.g. the
  // command runs while the Board overlay is open, or before the canvas mounts) the SVG is null and the
  // export used to no-op silently. Tell the user instead of doing nothing.
  const noCanvas = () =>
    onHint?.("Open a map on the canvas first to export an image, SVG, HTML or PDF.");

  // The rendered map as a clean, portable SVG string. The exporter (flow/exportSvg.ts) authors
  // native <text> from the model, so this only needs sanitizeSvg (strip XSS) for the file to
  // render everywhere — opened as a .svg, rasterized to PNG, in a PDF viewer, or placed in
  // Office — not only inline in a browser. null when there is no live map. Shared by png/svg/html/pdf.
  const cleanSvg = async (): Promise<string | null> => {
    const svg = mapRef.current?.exportSvg();
    return svg ? sanitizeSvg(await svg.text()) : null;
  };

  return {
    exportJson() {
      downloadBlob(
        new Blob([serializeDoc(getDoc())], { type: "application/json" }),
        `${baseName()}.json`,
      );
    },
    exportMarkdown() {
      const d = getDoc();
      const nums = numbered?.() ? outlineNumbers(d.root, d.meta?.numberStyle) : undefined;
      downloadBlob(new Blob([toMarkdown(d, nums)], { type: "text/markdown" }), `${baseName()}.md`);
    },
    // Mermaid `mindmap` text (mermaid.ts is dependency-free, so static-imported).
    exportMermaid() {
      downloadBlob(
        new Blob([toMermaid(getDoc())], { type: "text/vnd.mermaid" }),
        `${baseName()}.mmd`,
      );
    },
    async exportOpml() {
      // Lazy: opml.ts pulls in fast-xml-parser, kept out of the entry bundle.
      const { toOpml } = await import("./io/opml");
      downloadBlob(new Blob([toOpml(getDoc())], { type: "text/x-opml" }), `${baseName()}.opml`);
    },
    // FreeMind / Freeplane .mm — lazy (freemind.ts pulls fast-xml-parser for its importer).
    async exportFreemind() {
      const { toFreemind } = await import("./io/freemind");
      downloadBlob(
        new Blob([toFreemind(getDoc())], { type: "application/x-freemind" }),
        `${baseName()}.mm`,
      );
    },
    // XMind .xmind — a ZIP (content.json + metadata + manifest); lazy (xmind.ts pulls fflate).
    async exportXmind() {
      const { toXmind } = await import("./io/xmind");
      const bytes = toXmind(getDoc()) as BlobPart;
      downloadBlob(
        new Blob([bytes], { type: "application/vnd.xmind.workbook" }),
        `${baseName()}.xmind`,
      );
    },
    // SimpleMind .smmx — a ZIP (document/mindmap.xml); lazy (smmx.ts pulls fflate + fast-xml-parser).
    async exportSmmx() {
      const { toSmmx } = await import("./io/smmx");
      const bytes = toSmmx(getDoc()) as BlobPart;
      downloadBlob(new Blob([bytes], { type: "application/octet-stream" }), `${baseName()}.smmx`);
    },
    // MindManager .mmap — a ZIP (Document.xml); lazy (mmap.ts pulls fflate). Inverse of the
    // .mmap importer; round-trips topics/notes/links/icons + the two-sided side.
    async exportMmap() {
      const { toMmap } = await import("./io/mmap");
      const bytes = toMmap(getDoc()) as BlobPart;
      downloadBlob(
        new Blob([bytes], { type: "application/vnd.mindjet.mindmanager" }),
        `${baseName()}.mmap`,
      );
    },
    // png/svg/html/pdf all embed the rendered SVG via cleanSvg() (sanitize + native-text).
    async exportPng() {
      const clean = await cleanSvg();
      if (!clean) {
        noCanvas();
        return;
      }
      const blob = await svgToPng(clean);
      if (blob) downloadBlob(blob, `${baseName()}.png`);
    },
    async exportSvg() {
      const clean = await cleanSvg();
      if (!clean) {
        noCanvas();
        return;
      }
      downloadBlob(new Blob([clean], { type: "image/svg+xml" }), `${baseName()}.svg`);
    },
    async exportHtml() {
      const clean = await cleanSvg();
      if (!clean) {
        noCanvas();
        return;
      }
      downloadBlob(
        new Blob([wrapSvgHtml(clean, baseName())], { type: "text/html" }),
        `${baseName()}.html`,
      );
    },
    // Interactive HTML — the whole map as a single self-contained, offline .html
    // file you can email or open locally: a collapsible, searchable outline with
    // an inlined vanilla-JS runtime (no SVG, no backend, no CDN). Model-backed and
    // lazy-loaded so the template + runtime stay out of the entry chunk.
    async exportInteractiveHtml() {
      const { buildInteractiveHtml } = await import("./io/interactiveHtml");
      downloadBlob(
        new Blob([buildInteractiveHtml(getDoc())], { type: "text/html" }),
        `${baseName()}-interactive.html`,
      );
    },
    // Standalone slide deck — the Walk-Through as a shareable, offline .html file.
    // Model-backed (no SVG), lazy-loaded to keep the deck template out of the entry chunk.
    async exportDeck() {
      const { buildDeckHtml } = await import("./io/deck");
      downloadBlob(
        new Blob([buildDeckHtml(getDoc())], { type: "text/html" }),
        `${baseName()}-slides.html`,
      );
    },
    // Print-to-PDF: render the SVG into a hidden iframe and open the browser print
    // dialog ("Save as PDF"). Dep-free and fully local; an iframe dodges popup blockers.
    async exportPdf() {
      const clean = await cleanSvg();
      if (!clean) {
        noCanvas();
        return;
      }
      const html = buildPrintDoc(clean, baseName(), buildNotesAppendix(getDoc()));
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
      iframe.srcdoc = html;
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 1000);
      };
      document.body.appendChild(iframe);
    },
    // Word .docx — the outline as an editable document. Model-backed, lazy-loaded
    // (docx.ts pulls fflate for the OPC zip), kept out of the entry bundle.
    async exportDocx() {
      const { buildDocx } = await import("./io/docx");
      // fflate returns Uint8Array<ArrayBufferLike>; at runtime it's always a
      // plain ArrayBuffer-backed view, so it's a valid BlobPart — the cast just
      // satisfies the stricter lib.dom generic.
      const bytes = buildDocx(getDoc()) as BlobPart;
      downloadBlob(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        `${baseName()}.docx`,
      );
    },
    // PowerPoint .pptx — the Walk-Through as a real slide deck. Model-backed,
    // lazy-loaded (pptx.ts pulls fflate for the OPC zip).
    async exportPptx() {
      const { buildPptx } = await import("./io/pptx");
      const bytes = buildPptx(getDoc()) as BlobPart;
      downloadBlob(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        }),
        `${baseName()}.pptx`,
      );
    },
    // Excel .xlsx — the map as an indented outline worksheet. Model-backed,
    // lazy-loaded (xlsx.ts pulls fflate for the OPC zip).
    async exportXlsx() {
      const { buildXlsx } = await import("./io/xlsx");
      const bytes = buildXlsx(getDoc()) as BlobPart;
      downloadBlob(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `${baseName()}.xlsx`,
      );
    },
  };
}
