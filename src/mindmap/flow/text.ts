// Text wrapping shared by the SVG exporter and the layout size estimate. The live canvas wraps topic
// text via CSS (`max-width` + `white-space: pre-wrap`); the exporter emits native <text> and must
// reproduce that wrap so a long label stays inside its box (canvas == export), and the layout estimate
// must reserve the wrapped line count's height. Pure + deterministic.

/** Word-wrap `text` to fit `maxWidth` px at `fontSize`, using an average glyph-advance estimate (no
 *  font metrics available). Splits on explicit newlines first; a single word longer than the line is
 *  hard-split. Returns at least one (possibly empty) line. */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  // ~0.55em average advance — errs slightly wide so wrapped text stays inside the measured box.
  const charW = fontSize * 0.55;
  const maxChars = Math.max(1, Math.floor(maxWidth / charW));
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      let w = word;
      // Hard-split a word that can't fit on a line by itself.
      while (w.length > maxChars) {
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(w.slice(0, maxChars));
        w = w.slice(maxChars);
      }
      const candidate = line ? `${line} ${w}` : w;
      if (candidate.length <= maxChars) line = candidate;
      else {
        if (line) out.push(line);
        line = w;
      }
    }
    if (line) out.push(line);
  }
  return out.length > 0 ? out : [""];
}
