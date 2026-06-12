import { isExportSafeUrl } from "./urlSafety";

// Neutralise XSS vectors in an exported map SVG before it leaves the app as a
// standalone document (.svg / .html / print-to-PDF). mind-elixir builds the
// export SVG by re-injecting each node topic as live HTML inside an SVG
// <foreignObject> and each node hyperlink as a raw href — so a topic of
// `<img src=x onerror=…>` or a `javascript:` link would execute when the file
// is opened, because src/io/html.ts embeds the SVG as live markup.
//
// DOMPurify can't be used here: it strips <foreignObject> content in every
// profile, which would blank every node. So this is a hand-rolled, namespace-
// aware pass that KEEPS foreignObject + its xhtml while removing script-bearing
// elements, event-handler attributes, and dangerous URL schemes. Browser-only
// (DOMParser/XMLSerializer, like src/io/image.ts); unit-tested under jsdom and
// verified to round-trip a real mind-elixir export with every topic intact.

// Elements that can execute script or pull active remote content — removed with
// their subtree. Everything else is kept: all SVG elements and the xhtml
// <div>/<span>/<a>/<img>/<style> that carry node topics inside foreignObject.
const FORBIDDEN_TAGS = new Set(["script", "iframe", "object", "embed", "base", "link", "meta"]);

// URL-bearing attributes that get scheme-filtered. `href` matches both the plain
// and the xlink: namespaced form (same localName); `src` covers <img>/<image>.
const URL_ATTRS = new Set(["href", "src"]);

function scrub(el: Element): void {
  // Snapshot first: removing an attribute mutates the live NamedNodeMap.
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on")) {
      el.removeAttributeNode(attr);
      continue;
    }
    const local = (attr.localName ?? name).toLowerCase();
    if (URL_ATTRS.has(local) && !isExportSafeUrl(attr.value)) {
      el.removeAttributeNode(attr);
    }
  }
}

// Best-effort strip for the rare case the SVG doesn't parse as XML — fail safe,
// never return the raw input. Regex HTML editing is fragile, so this is only the
// fallback; the DOM walk below is the real sanitiser.
function stripFallback(svg: string): string {
  return svg
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(?:script|iframe|object|embed|base|link|meta)\b[^>]*?\/?>/gi, "")
    .replace(/\son[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s/>]+)/gi, "")
    .replace(/\s(?:xlink:href|href|src)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s/>]+)/gi, (m) =>
      /(?:javascript|vbscript|data):/i.test(m) ? "" : m,
    );
}

/**
 * Return a copy of an exported SVG with script-bearing elements, inline event
 * handlers, and dangerous URL schemes removed, while preserving foreignObject
 * node topics, styling, and inline images. Serialises the documentElement, so
 * the `<?xml?>`/DOCTYPE prolog is dropped (cleaner when embedded inline in HTML).
 */
export function sanitizeSvg(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  // A malformed document yields a <parsererror> (or no usable root); fall back
  // to a conservative string strip rather than emitting the raw input.
  if (!root || root.localName === "parsererror" || doc.getElementsByTagName("parsererror").length) {
    return stripFallback(svg);
  }

  scrub(root);
  // Snapshot the live descendant list before mutating the tree.
  const toRemove: Element[] = [];
  for (const el of Array.from(root.getElementsByTagName("*"))) {
    if (FORBIDDEN_TAGS.has((el.localName ?? "").toLowerCase())) toRemove.push(el);
    else scrub(el);
  }
  for (const el of toRemove) el.remove();

  return new XMLSerializer().serializeToString(root);
}
