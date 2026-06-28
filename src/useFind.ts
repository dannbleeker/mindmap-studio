import { type FormEvent, type RefObject, useRef, useState } from "react";
import type { MindMapHandle } from "./mindmap";
import type { MindMapDoc } from "./model/types";
import { findDocMatches } from "./search";

// Header "Find" behaviour: match nodes by topic/note, focus each on the canvas,
// and cycle through hits on repeated Enter. Kept out of App as a self-contained
// hook; the matching itself lives in the pure, unit-tested `findMatches`.
export type ReplaceScope = "topics" | "notes" | "both";

export function useFind(mapRef: RefObject<MindMapHandle | null>, getDoc: () => MindMapDoc) {
  const [query, setQuery] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [replaceScope, setReplaceScope] = useState<ReplaceScope>("topics");
  const [useRegex, setUseRegex] = useState(false);
  const [matchCase, setMatchCase] = useState(false);
  const [matchInfo, setMatchInfo] = useState("");
  const cursor = useRef({ q: "", i: -1 });

  // Move to the next (dir=1) or previous (dir=-1) match, cycling and restarting when the query
  // changes. Shared by Enter (next), the on-screen Next/Prev buttons, and Shift+Enter (prev).
  function step(dir: 1 | -1) {
    const matches = findDocMatches(getDoc(), query);
    if (matches.length === 0) {
      setMatchInfo(query.trim() ? "no matches" : "");
      return;
    }
    const c = cursor.current;
    const len = matches.length;
    const i = c.q === query ? (c.i + dir + len) % len : dir === 1 ? 0 : len - 1;
    cursor.current = { q: query, i };
    mapRef.current?.focusNode(matches[i]);
    setMatchInfo(`${i + 1}/${len}`);
  }

  function runSearch(event: FormEvent) {
    event.preventDefault();
    step(1);
  }
  const findNext = () => step(1);
  const findPrev = () => step(-1);

  function runReplace() {
    const scope = {
      topics: replaceScope !== "notes",
      notes: replaceScope !== "topics",
      regex: useRegex,
      matchCase,
    };
    const n = mapRef.current?.replaceTopics(query, replaceWith, scope) ?? 0;
    // -1 signals a malformed regex pattern (only possible when `regex` is on).
    setMatchInfo(n < 0 ? "invalid regex" : n > 0 ? `replaced ${n}` : "no matches");
  }

  return {
    query,
    setQuery,
    replaceWith,
    setReplaceWith,
    replaceScope,
    setReplaceScope,
    useRegex,
    setUseRegex,
    matchCase,
    setMatchCase,
    matchInfo,
    runSearch,
    findNext,
    findPrev,
    runReplace,
  };
}
