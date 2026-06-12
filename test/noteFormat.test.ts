import { describe, expect, it } from "vitest";
import { renderNote } from "../src/noteFormat";

describe("renderNote", () => {
  it("renders headings, bold, italic, and code", () => {
    expect(renderNote("# Title")).toBe("<h1>Title</h1>");
    expect(renderNote("**bold** and *italic* and `code`")).toBe(
      "<p><strong>bold</strong> and <em>italic</em> and <code>code</code></p>",
    );
  });

  it("renders bullet lists", () => {
    expect(renderNote("- one\n- two")).toBe("<ul>\n<li>one</li>\n<li>two</li>\n</ul>");
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
});
