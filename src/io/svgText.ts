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
// Multi-line topics (explicit line breaks) become one <text> with a <tspan> per line,
// distributed over the box height; a single-line topic stays a plain <text> (the exact,
// verified common case). Soft CSS wrapping carries no line break in textContent, so a very
// long single-segment topic can still overflow its box — acceptable and rare.

const SVG_NS = "http://www.w3.org/2000/svg";

// Read a single CSS declaration's value from an inline style string. Anchored at start or
// after a `;` so `color` doesn't match `background-color`.
function styleValue(style: string, prop: string): string | null {
  const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i").exec(style);
  return m ? m[1].trim() : null;
}

// Round to 2 dp so serialized coordinates stay compact and stable across runs.
const round2 = (n: number): string => String(Math.round(n * 100) / 100);

export function inlineSvgText(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.localName === "parsererror" || doc.getElementsByTagName("parsererror").length) {
    return svg; // unparseable — leave as-is (sanitizeSvg already ran on it)
  }

  for (const fo of Array.from(doc.getElementsByTagName("foreignObject"))) {
    // One trimmed line per explicit break; intra-line whitespace runs collapse to a space.
    const lines = (fo.textContent ?? "")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) {
      fo.remove(); // image-only / empty node — nothing to render as text
      continue;
    }

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
    text.setAttribute("font-family", "sans-serif");
    text.setAttribute("font-size", String(fontSize));
    text.setAttribute("fill", color);
    if (weight && weight !== "400" && weight !== "normal") text.setAttribute("font-weight", weight);

    // Single line: baseline ~vertically centred in the box. Multiple lines: stack them around
    // that same centre so the block stays centred (line advance ~1.2em, the usual ratio).
    const centreBaseline = y + h * 0.72;
    if (lines.length === 1) {
      text.setAttribute("y", round2(centreBaseline));
      text.textContent = lines[0];
    } else {
      const lineHeight = fontSize * 1.2;
      const firstBaseline = centreBaseline - ((lines.length - 1) * lineHeight) / 2;
      text.setAttribute("y", round2(firstBaseline));
      for (const [i, line] of lines.entries()) {
        const tspan = doc.createElementNS(SVG_NS, "tspan");
        tspan.setAttribute("x", String(x));
        if (i > 0) tspan.setAttribute("dy", round2(lineHeight));
        tspan.textContent = line;
        text.appendChild(tspan);
      }
    }

    fo.replaceWith(text);
  }

  return new XMLSerializer().serializeToString(root);
}
