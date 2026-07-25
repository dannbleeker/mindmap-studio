// Selection-based rich-text commands for the two contentEditable editors (the Notes panel and the
// inline topic editor), replacing `document.execCommand` — deprecated in every engine, with no
// specified behaviour and no replacement API.
//
// The contract these have to honour is NOT DOM fidelity: both editors serialise their HTML straight
// back to markdown (`noteFormat.htmlToNote`) or to the topic's stored rich text, so what matters is
// that the markup lands in the tag family the serialiser understands (b/i/u/s, a, mark, h1-3, span
// with a colour). That's why these emit semantic tags rather than styled spans — exactly what the old
// `execCommand("styleWithCSS", false, "false")` call was asking the browser for.
//
// Deliberately NOT reimplemented here: `insertUnorderedList` / `insertOrderedList`. List toggling is a
// genuine rich-text-engine problem (splitting blocks into items, merging adjacent lists, nesting) and
// a shaky version would regress a working editor, so the two list buttons still call execCommand —
// see `listFallback` below and the note in NEXT_STEPS.

/** Tags we toggle as inline formatting. Semantic, so the markdown serialiser recognises them. */
export type InlineTag = "b" | "i" | "u" | "s";

/** The live selection range, but only when it sits inside `root` (so a command can't reach out of the
 *  editor and mangle the rest of the page). Null when there's no usable selection. */
export function rangeWithin(root: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  return root.contains(range.commonAncestorContainer) ? range : null;
}

/** Put the selection around `node`'s contents — keeps the just-formatted text selected, so pressing
 *  bold then italic applies both, the way the native command did. */
function selectContents(node: Node): void {
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  r.selectNodeContents(node);
  sel.removeAllRanges();
  sel.addRange(r);
}

/** The nearest ancestor of `n` matching `match`, stopping at (and excluding) `root`. */
function closestWithin(
  n: Node | null,
  root: HTMLElement,
  match: (el: HTMLElement) => boolean,
): HTMLElement | null {
  let cur: Node | null = n;
  while (cur && cur !== root) {
    if (cur.nodeType === 1 && match(cur as HTMLElement)) return cur as HTMLElement;
    cur = cur.parentNode;
  }
  return null;
}

/** Replace `el` with its own children, leaving the text in place. */
function unwrap(el: HTMLElement): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
  if (parent.nodeType === 1) (parent as HTMLElement).normalize();
}

/** Wrap the range's contents in `el`. `extractContents` (not `surroundContents`) so a selection that
 *  crosses element boundaries still works — `surroundContents` throws on those. */
function wrapRange(range: Range, el: HTMLElement): void {
  el.appendChild(range.extractContents());
  range.insertNode(el);
  selectContents(el);
}

/** The text nodes the range actually covers, ignoring whitespace-only ones. The filter matters: in
 *  `<b>one</b> <b>two</b>` the separating space belongs to no <b>, and counting it would make a
 *  fully-bold selection look partly unformatted — browsers ignore such nodes when computing state. */
function coveredTextNodes(range: Range, root: HTMLElement): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    if (/\S/.test(n.textContent ?? "") && range.intersectsNode(n)) out.push(n as Text);
    n = walker.nextNode();
  }
  return out;
}

/**
 * Toggle an inline format over the selection, mirroring `execCommand("bold"|"italic"|…)`.
 *
 * Toggles OFF when every covered text node already sits inside a tag of this kind (select a bold
 * word — or the whole of an entirely bold note — and hit bold); otherwise formats. A partial
 * selection formats rather than unformats, which is what the native command did too.
 *
 * No-ops on a collapsed selection. `execCommand` would arm a "typing style" so the *next* characters
 * came out bold; there's no standards-track way to reproduce that, so formatting now requires a
 * selection. This is the one deliberate behaviour change in the migration.
 */
export function toggleInline(root: HTMLElement, tag: InlineTag): void {
  const range = rangeWithin(root);
  if (!range || range.collapsed) return;
  const isTag = (el: HTMLElement) => el.tagName.toLowerCase() === tag;
  // Checking only `commonAncestorContainer` is NOT enough: select all of `<b>word</b>` and the common
  // ancestor is the editor root, not the <b> — which silently double-wrapped instead of toggling off.
  const covered = coveredTextNodes(range, root);
  const wrappers = covered.map((n) => closestWithin(n, root, isTag));
  if (covered.length > 0 && wrappers.every(Boolean)) {
    for (const el of new Set(wrappers as HTMLElement[])) unwrap(el);
    return;
  }
  const el = document.createElement(tag);
  wrapRange(range, el);
  // Formatting a partly-formatted selection nests the same tag inside the new one. Harmless to render
  // and to serialise, but it would pile up over repeated use — flatten it.
  for (const nested of Array.from(el.querySelectorAll(tag))) unwrap(nested as HTMLElement);
}

/** Colour the selection, mirroring `execCommand("foreColor", …)`. A `<span style="color:…">` is what
 *  the topic editor's serialiser already reads, and re-colouring reuses the existing span rather than
 *  nesting a new one on every click. */
export function applyColor(root: HTMLElement, color: string): void {
  const range = rangeWithin(root);
  if (!range || range.collapsed) return;
  const existing = closestWithin(
    range.commonAncestorContainer,
    root,
    (el) => el.tagName === "SPAN" && !!el.style.color,
  );
  // Only reuse the span when the selection covers all of it — otherwise recolouring part of a
  // coloured run would silently restyle the whole run.
  if (existing && range.toString() === existing.textContent) {
    existing.style.color = color;
    return;
  }
  const span = document.createElement("span");
  span.style.color = color;
  wrapRange(range, span);
}

/** Insert plain text at the selection, mirroring `execCommand("insertText", …)` — used by the paste
 *  handler, which deliberately strips HTML. Leaves the caret after the inserted text. */
export function insertText(root: HTMLElement, text: string): void {
  const range = rangeWithin(root);
  if (!range) return;
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  const sel = window.getSelection();
  const after = document.createRange();
  after.setStartAfter(node);
  after.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(after);
}

/** Wrap the selection in a link, mirroring `execCommand("createLink", …)`. The caller supplies the
 *  range because the URL prompt drops the live selection. */
export function createLink(range: Range, url: string): void {
  if (range.collapsed) return;
  const a = document.createElement("a");
  a.href = url;
  wrapRange(range, a);
}

/** Retag the block containing the selection, mirroring `execCommand("formatBlock", …)`.
 *
 * Finds the nearest block-level ancestor inside the editor and swaps its tag, preserving children.
 * When the selection sits in loose text with no block wrapper (the editor's default state), the
 * root's children are wrapped in the new block instead. Re-applying the same tag returns it to a
 * plain paragraph, which is how the heading buttons toggle. */
export function formatBlock(root: HTMLElement, tag: string): void {
  const range = rangeWithin(root);
  if (!range) return;
  const wanted = tag.replace(/[<>]/g, "").toLowerCase();
  const BLOCKS = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "blockquote"]);
  const block = closestWithin(range.commonAncestorContainer, root, (el) =>
    BLOCKS.has(el.tagName.toLowerCase()),
  );
  const replacement = document.createElement(
    block && block.tagName.toLowerCase() === wanted ? "p" : wanted,
  );
  if (block) {
    while (block.firstChild) replacement.appendChild(block.firstChild);
    block.parentNode?.replaceChild(replacement, block);
  } else {
    while (root.firstChild) replacement.appendChild(root.firstChild);
    root.appendChild(replacement);
  }
  selectContents(replacement);
}

/** The two list commands still route through `execCommand` — see the header. Isolated here so the
 *  remaining deprecated surface is one call in one place, and so the call sites read the same as
 *  every other command. Returns false when the browser has dropped it, letting a caller react. */
export function listFallback(command: "insertUnorderedList" | "insertOrderedList"): boolean {
  if (typeof document.execCommand !== "function") return false;
  try {
    return document.execCommand(command);
  } catch {
    return false;
  }
}
