import { type FormEvent, type RefObject, useRef, useState } from "react";
import type { MindMapHandle } from "./mindmap/MindMap";
import type { MindMapDoc } from "./model/types";
import { findDocMatches } from "./search";

// Header "Find" behaviour: match nodes by topic/note, focus each on the canvas,
// and cycle through hits on repeated Enter. Kept out of App as a self-contained
// hook; the matching itself lives in the pure, unit-tested `findMatches`.
export function useFind(mapRef: RefObject<MindMapHandle | null>, getDoc: () => MindMapDoc) {
  const [query, setQuery] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [matchInfo, setMatchInfo] = useState("");
  const cursor = useRef({ q: "", i: -1 });

  function runSearch(event: FormEvent) {
    event.preventDefault();
    const matches = findDocMatches(getDoc(), query);
    if (matches.length === 0) {
      setMatchInfo(query.trim() ? "no matches" : "");
      return;
    }
    // Cycle through matches on repeated Enter; restart when the query changes.
    const c = cursor.current;
    const i = c.q === query ? (c.i + 1) % matches.length : 0;
    cursor.current = { q: query, i };
    mapRef.current?.focusNode(matches[i]);
    setMatchInfo(`${i + 1}/${matches.length}`);
  }

  function runReplace() {
    const n = mapRef.current?.replaceTopics(query, replaceWith) ?? 0;
    setMatchInfo(n > 0 ? `replaced ${n}` : "no matches");
  }

  return { query, setQuery, replaceWith, setReplaceWith, matchInfo, runSearch, runReplace };
}
