import { describe, expect, it } from "vitest";
import { htmlToNote, renderNote } from "../src/noteFormat";

describe("renderNote", () => {
  it("renders headings, bold, italic, and code", () => {
    expect(renderNote("# Title")).toBe("<h1>Title</h1>");
    expect(renderNote("**bold** and *italic* and `code`")).toBe(
      "<p><strong>bold</strong> and <em>italic</em> and <code>code</code></p>",
    );
  });

  it("renders strikethrough", () => {
    expect(renderNote("~~gone~~")).toBe("<p><del>gone</del></p>");
  });

  it("renders bullet lists", () => {
    expect(renderNote("- one\n- two")).toBe("<ul>\n<li>one</li>\n<li>two</li>\n</ul>");
  });

  it("renders numbered lists as an <ol> (auto-numbered)", () => {
    expect(renderNote("1. one\n2. two")).toBe("<ol>\n<li>one</li>\n<li>two</li>\n</ol>");
  });

  it("keeps bullet and numbered lists as separate blocks", () => {
    expect(renderNote("- a\n1. b")).toBe("<ul>\n<li>a</li>\n</ul>\n<ol>\n<li>b</li>\n</ol>");
  });

  it("renders only http(s) links", () => {
    expect(renderNote("[site](https://x.test)")).toContain(
      '<a href="https://x.test" target="_blank" rel="noopener noreferrer">site</a>',
    );
  });

  it("escapes HTML so notes can't inject markup", () => {
    expect(renderNote("<script>alert(1)</script>")).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
    // a javascript: link is not turned into an anchor
    expect(renderNote("[x](javascript:alert(1))")).not.toContain("<a ");
  });

  it("escapes quotes so a link URL can't break out of the href attribute", () => {
    // Regression: `"` used to pass through escapeHtml, so a markdown link URL
    // containing a quote broke out of href="…" and injected a live attribute
    // (e.g. an event handler) — a stored XSS, since notes render via
    // dangerouslySetInnerHTML and can arrive from an imported map.
    const styled = renderNote('[c](https://a"style=color:red)');
    expect(styled).not.toContain('"style=');
    expect(styled).toContain("&quot;style=color:red");
    expect(renderNote('[h](https://x"onmouseover=alert)')).not.toMatch(/"onmouseover/i);
  });
});

describe("htmlToNote", () => {
  const roundTrip = (md: string) => htmlToNote(renderNote(md));

  it("round-trips the markdown subset (md → html → md)", () => {
    for (const md of [
      "plain text",
      "**bold**",
      "*italic*",
      "~~gone~~",
      "`code`",
      "# Title",
      "## Sub",
      "- one\n- two",
      "1. one\n2. two",
      "[site](https://x.test)",
      "para one\n\npara two",
    ]) {
      expect(roundTrip(md)).toBe(md);
    }
  });

  it("normalises the tag soup execCommand emits (b/i/s/strike/div)", () => {
    expect(htmlToNote("<b>x</b>")).toBe("**x**");
    expect(htmlToNote("<i>x</i>")).toBe("*x*");
    expect(htmlToNote("<s>x</s>")).toBe("~~x~~");
    expect(htmlToNote("<strike>x</strike>")).toBe("~~x~~");
    expect(htmlToNote("<div>line one</div><div>line two</div>")).toBe("line one\n\nline two");
  });

  it("serialises an empty / whitespace editor to an empty string", () => {
    expect(htmlToNote("")).toBe("");
    expect(htmlToNote("<br>")).toBe("");
    expect(htmlToNote("<div><br></div>")).toBe("");
  });
});
