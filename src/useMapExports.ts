import type { RefObject } from "react";
import { buildPrintDoc, wrapSvgHtml } from "./io/html";
import { serializeDoc } from "./io/json";
import { toMarkdown } from "./io/markdown";
import { sanitizeSvg } from "./io/svgSanitize";
import type { MindMapHandle } from "./mindmap/MindMap";
import type { MindMapDoc } from "./model/types";

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface MapExports {
  exportJson: () => void;
  exportMarkdown: () => void;
  exportOpml: () => Promise<void>;
  exportPng: () => Promise<void>;
  exportSvg: () => Promise<void>;
  exportHtml: () => Promise<void>;
  exportDeck: () => Promise<void>;
  exportPdf: () => Promise<void>;
  exportDocx: () => Promise<void>;
  exportPptx: () => Promise<void>;
}

// Download handlers for every export format, kept out of App so the component
// isn't dominated by I/O plumbing. Renderer-backed formats (png/svg/html/pdf) go
// through the MindMap ref; model-backed ones (json/md) read the current doc.
export function useMapExports(
  mapRef: RefObject<MindMapHandle | null>,
  getDoc: () => MindMapDoc,
): MapExports {
  const baseName = () => getDoc().title || "mindmap";

  return {
    exportJson() {
      download(
        new Blob([serializeDoc(getDoc())], { type: "application/json" }),
        `${baseName()}.json`,
      );
    },
    exportMarkdown() {
      download(new Blob([toMarkdown(getDoc())], { type: "text/markdown" }), `${baseName()}.md`);
    },
    async exportOpml() {
      // Lazy: opml.ts pulls in fast-xml-parser, kept out of the entry bundle.
      const { toOpml } = await import("./io/opml");
      download(new Blob([toOpml(getDoc())], { type: "text/x-opml" }), `${baseName()}.opml`);
    },
    async exportPng() {
      const blob = await mapRef.current?.exportPng();
      if (blob) download(blob, `${baseName()}.png`);
    },
    // SVG/HTML/PDF all embed the rendered SVG as live markup, so every one runs
    // through sanitizeSvg first — mind-elixir re-injects node topics + hyperlinks
    // unescaped, which would otherwise execute when the exported file is opened.
    async exportSvg() {
      const svg = mapRef.current?.exportSvg();
      if (!svg) return;
      const clean = sanitizeSvg(await svg.text());
      download(new Blob([clean], { type: "image/svg+xml" }), `${baseName()}.svg`);
    },
    async exportHtml() {
      const svg = mapRef.current?.exportSvg();
      if (!svg) return;
      const html = wrapSvgHtml(sanitizeSvg(await svg.text()), baseName());
      download(new Blob([html], { type: "text/html" }), `${baseName()}.html`);
    },
    // Standalone slide deck — the Walk-Through as a shareable, offline .html file.
    // Model-backed (no SVG), lazy-loaded to keep the deck template out of the entry chunk.
    async exportDeck() {
      const { buildDeckHtml } = await import("./io/deck");
      download(
        new Blob([buildDeckHtml(getDoc())], { type: "text/html" }),
        `${baseName()}-slides.html`,
      );
    },
    // Print-to-PDF: render the SVG into a hidden iframe and open the browser print
    // dialog ("Save as PDF"). Dep-free and fully local; an iframe dodges popup blockers.
    async exportPdf() {
      const svg = mapRef.current?.exportSvg();
      if (!svg) return;
      const html = buildPrintDoc(sanitizeSvg(await svg.text()), baseName());
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
      download(
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
      download(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        }),
        `${baseName()}.pptx`,
      );
    },
  };
}
