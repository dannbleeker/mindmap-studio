import type { RefObject } from "react";
import { buildPrintDoc, wrapSvgHtml } from "./io/html";
import { serializeDoc } from "./io/json";
import { toMarkdown } from "./io/markdown";
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
  exportSvg: () => void;
  exportHtml: () => Promise<void>;
  exportPdf: () => Promise<void>;
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
    exportSvg() {
      const blob = mapRef.current?.exportSvg();
      if (blob) download(blob, `${baseName()}.svg`);
    },
    async exportHtml() {
      const svg = mapRef.current?.exportSvg();
      if (!svg) return;
      const html = wrapSvgHtml(await svg.text(), baseName());
      download(new Blob([html], { type: "text/html" }), `${baseName()}.html`);
    },
    // Print-to-PDF: render the SVG into a hidden iframe and open the browser print
    // dialog ("Save as PDF"). Dep-free and fully local; an iframe dodges popup blockers.
    async exportPdf() {
      const svg = mapRef.current?.exportSvg();
      if (!svg) return;
      const html = buildPrintDoc(await svg.text(), baseName());
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
  };
}
