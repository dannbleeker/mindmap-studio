// Name-based link autocomplete for the inline topic editor: type `[[` (wiki-link) or `@` (mention) and
// pick a topic/map by name to author a link. Like the slash menu, the fiddly parts — detecting the
// trigger token at the caret and rewriting the buffer on select — are pure functions here so they're
// unit-tested; TopicNode owns the DOM caret + popup, FlowMindMap owns the candidate list + link op.

export interface LinkCandidate {
  /** Node id (kind "node") or map id (kind "map"). */
  id: string;
  /** Display name shown in the menu + inserted into the topic text on select. */
  label: string;
  /** The hyperlink to attach: `#node=<id>` for a topic, `#map=<id>` for a map. */
  link: string;
  kind: "node" | "map";
}

export interface LinkTrigger {
  kind: "wiki" | "mention";
  /** Text between the trigger and the caret (the live query). */
  query: string;
  /** Index in the text where the replaceable token starts (the first `[` or the `@`). */
  start: number;
  /** Index where the token ends (the caret). */
  end: number;
}

/** Detect a link-authoring token ending at `caret`: `[[query` (wiki) or `@query` (mention). Returns the
 *  token nearest the caret, or null. A wiki token is an unclosed `[[` (no `]]` after it); a mention is
 *  an `@` at a word boundary (line start or after whitespace). Neither may span a newline. */
export function linkTriggerAt(text: string, caret: number): LinkTrigger | null {
  const before = text.slice(0, Math.max(0, Math.min(caret, text.length)));
  const end = before.length;

  let wiki: LinkTrigger | null = null;
  const wikiOpen = before.lastIndexOf("[[");
  if (wikiOpen !== -1) {
    const seg = before.slice(wikiOpen + 2);
    if (!seg.includes("]]") && !seg.includes("\n") && !seg.includes("[["))
      wiki = { kind: "wiki", query: seg, start: wikiOpen, end };
  }

  let mention: LinkTrigger | null = null;
  const atPos = before.lastIndexOf("@");
  if (atPos !== -1) {
    const prev = atPos === 0 ? "" : before[atPos - 1];
    const seg = before.slice(atPos + 1);
    if ((atPos === 0 || /\s/.test(prev)) && !seg.includes("\n"))
      mention = { kind: "mention", query: seg, start: atPos, end };
  }

  // Whichever token starts nearer the caret is the one the user is actively inside.
  if (wiki && mention) return wiki.start >= mention.start ? wiki : mention;
  return wiki ?? mention;
}

/** Rewrite the buffer for a selected candidate: replace the trigger token `[start, end)` with `label`.
 *  Returns the new text and the caret position (just after the inserted label). */
export function applyLinkSelection(
  text: string,
  trigger: LinkTrigger,
  label: string,
): { text: string; caret: number } {
  const next = text.slice(0, trigger.start) + label + text.slice(trigger.end);
  return { text: next, caret: trigger.start + label.length };
}

/** Candidates matching `query` (case-insensitive substring on the label), capped at `limit`. An empty
 *  query lists the first `limit`; a query matching nothing returns [] (the caller closes the menu). */
export function matchLinkCandidates(
  candidates: LinkCandidate[],
  query: string,
  limit = 8,
): LinkCandidate[] {
  const q = query.trim().toLowerCase();
  const pool = q ? candidates.filter((c) => c.label.toLowerCase().includes(q)) : candidates;
  return pool.slice(0, limit);
}
