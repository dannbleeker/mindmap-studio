// Convert mind-elixir's foreignObject (HTML-in-SVG) topic labels into native SVG <text>,
// so an exported map renders everywhere — opened as a standalone .svg, rasterized to PNG,
// in a PDF viewer, or pasted into Office — not only inline in a browser, which is the one
// place foreignObject renders. Node boxes (<rect>) and branch lines (<path>) are already
// real SVG, so this only swaps the text layer. Browser/jsdom (DOMParser/XMLSerializer),
// like src/io/svgSanitize.ts; run it AFTER sanitizeSvg.
//
// Why not mind-elixir's built-in exportSvg(true) (its `noForeignObject` path)? It exists,
// but its native-text builder recomputes label positions independently and gets the y wrong
// — verified empirically, the text floats at the top of the canvas, detached from the boxes.
// This module instead reuses the foreignObject's own x/y (which mind-elixir already placed
// correctly for the on-screen render), so labels land inside their boxes. Do not "simplify"
// to exportSvg(true) without re-checking a rendered export.
//
// Known limitation: a topic with an explicit line break is collapsed to a single line
// (see the textContent normalisation below). The common single-line case is exact; genuine
// multi-line topics would benefit from per-line <tspan>s — tracked in NEXT_STEPS.

const SVG_NS = "http://www.w3.org/2000/svg";

// Read a single CSS declaration's value from an inline style string. Anchored at start or
// after a `;` so `color` doesn't match `background-color`.
function styleValue(style: string, prop: string): string | null {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i").exec(style);
  return m ? m[1].trim() : null;
}

export function inlineSvgText(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.localName === "parsererror" || doc.getElementsByTagName("parsererror").length) {
    return svg; // unparseable — leave as-is (sanitizeSvg already ran on it)
  }

  for (const fo of Array.from(doc.getElementsByTagName("foreignObject"))) {
    const label = (fo.textContent ?? "").replace(/\s+/g, " ").trim();
    const x = Number.parseFloat(fo.getAttribute("x") ?? "0");
    const y = Number.parseFloat(fo.getAttribute("y") ?? "0");
    const h = Number.parseFloat(fo.getAttribute("height") ?? "20");

    const styled = fo.querySelector("[style]");
    const style = styled?.getAttribute("style") ?? "";
    const fontSize = Number.parseFloat(styleValue(style, "font-size") ?? "16") || 16;
    const color = styleValue(style, "color") ?? "#2c2c2a";
    const weight = styleValue(style, "font-weight");

    const text = doc.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(x));
    // Baseline ~vertically centred in the original box (height h, font fontSize).
    text.setAttribute("y", String(Math.round((y + h * 0.72) * 100) / 100));
    text.setAttribute("font-family", "sans-serif");
    text.setAttribute("font-size", String(fontSize));
    text.setAttribute("fill", color);
    if (weight && weight !== "400" && weight !== "normal") text.setAttribute("font-weight", weight);
    text.textContent = label;

    fo.replaceWith(text);
  }

  return new XMLSerializer().serializeToString(root);
}
