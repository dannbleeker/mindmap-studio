// Render a small, safe Markdown subset for note previews. HTML is escaped first,
// then a handful of inline/block transforms are applied — so user notes can't
// inject markup. Pure + deterministic (unit-tested); the Notes panel feeds the
// result to dangerouslySetInnerHTML.

function escapeHtml(s: string): string {
  // Quotes MUST be escaped too: the link transform drops the matched URL into a
  // double-quoted href="…", so a `"` in a markdown link would otherwise break
  // out of the attribute and inject live markup (e.g. an event handler). This
  // runs first on the whole note, so no user character survives as a raw quote.
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(s: string): string {
  return (
    s
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      // [text](http(s)://url) — only http(s) links, so no javascript: injection
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      )
  );
}

export function renderNote(md: string): string {
  const lines = escapeHtml(md).split(/\r?\n/);
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const openList = (type: "ul" | "ol") => {
    if (listType !== type) {
      closeList();
      out.push(`<${type}>`);
      listType = type;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (bullet) {
      openList("ul");
      out.push(`<li>${inline(bullet[1])}</li>`);
    } else if (numbered) {
      openList("ol");
      out.push(`<li>${inline(numbered[1])}</li>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}

// Serialise the Notes editor's HTML back to the markdown subset renderNote understands — the inverse
// of renderNote, so the WYSIWYG editor stores plain markdown (keeping every export/search/presentation
// path that reads `note` as markdown working). Walks the DOM rather than regexing HTML so it tolerates
// the tag soup execCommand emits (b/strong, i/em, s/strike/del, ul/ol/li, h1-3, p/div, br, a).
function serializeChildren(node: Node): string {
  let s = "";
  for (const child of node.childNodes) s += serializeNode(child);
  return s;
}

function serializeList(listEl: Element, ordered: boolean): string {
  let s = "";
  let i = 0;
  for (const li of listEl.childNodes) {
    if (li.nodeType === 1 && (li as Element).tagName.toLowerCase() === "li") {
      const marker = ordered ? `${++i}. ` : "- ";
      s += `${marker}${serializeChildren(li).trim()}\n`;
    }
  }
  return s;
}

function serializeNode(node: Node): string {
  if (node.nodeType === 3) return node.textContent ?? ""; // text
  if (node.nodeType !== 1) return "";
  const el = node as Element;
  const inner = serializeChildren(el);
  switch (el.tagName.toLowerCase()) {
    case "strong":
    case "b":
      return inner.trim() ? `**${inner}**` : inner;
    case "em":
    case "i":
      return inner.trim() ? `*${inner}*` : inner;
    case "del":
    case "s":
    case "strike":
      return inner.trim() ? `~~${inner}~~` : inner;
    case "code":
      return inner.trim() ? `\`${inner}\`` : inner;
    case "a":
      return `[${inner}](${el.getAttribute("href") ?? ""})`;
    case "h1":
      return `# ${inner}\n\n`;
    case "h2":
      return `## ${inner}\n\n`;
    case "h3":
      return `### ${inner}\n\n`;
    case "ul":
      return `${serializeList(el, false)}\n`;
    case "ol":
      return `${serializeList(el, true)}\n`;
    case "li":
      return inner; // handled by serializeList
    case "br":
      return "\n";
    case "p":
    case "div":
      return `${inner}\n\n`;
    default:
      return inner;
  }
}

export function htmlToNote(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return serializeChildren(div)
    .replace(/[ \t]+\n/g, "\n") // trailing spaces before a newline
    .replace(/\n{3,}/g, "\n\n") // collapse blank-line runs
    .replace(/^\n+/, "")
    .trimEnd();
}
