import { useEffect, useRef } from "react";
import type { ToolbarFind } from "./Toolbar";

/**
 * Find & Replace as a non-modal overlay anchored to the top-right of the canvas (opened with
 * Ctrl/⌘+F, the "/" key, or the toolbar's Find button). It owns no state — every input is wired
 * to the shared `useFind` hook via the `ToolbarFind` contract, so live highlighting and Replace
 * behave exactly as they did inline in the toolbar. Esc closes it.
 */
export function FindReplaceOverlay({ find, onClose }: { find: ToolbarFind; onClose: () => void }) {
  const queryRef = useRef<HTMLInputElement>(null);

  // Focus the Find box on open so you can type immediately.
  useEffect(() => {
    queryRef.current?.focus();
    queryRef.current?.select();
  }, []);

  return (
    // A non-modal, labelled find panel (not a native <dialog>: it must not trap focus or dim the
    // canvas, and jsdom can't render <dialog open>). Esc closes it via the bubbled keydown below.
    <div
      className="mm-find-overlay"
      aria-label="Find and replace"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="mm-find-head">
        <span className="mm-find-title">Find &amp; replace</span>
        <button
          type="button"
          className="mm-find-close"
          aria-label="Close find"
          title="Close (Esc)"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <form onSubmit={find.runSearch} className="mm-find-body">
        <input
          ref={queryRef}
          className="mm-input"
          value={find.query}
          onChange={(e) => find.setQuery(e.target.value)}
          placeholder="Find…"
          aria-label="Find node"
        />
        <input
          className="mm-input"
          value={find.replaceWith}
          onChange={(e) => find.setReplaceWith(e.target.value)}
          placeholder="Replace…"
          aria-label="Replace with"
        />
        <div className="mm-find-row">
          <select
            className="mm-input"
            value={find.replaceScope}
            onChange={(e) => find.setReplaceScope(e.target.value as "topics" | "notes" | "both")}
            aria-label="Replace scope"
            title="Where to replace: topics, notes, or both"
          >
            <option value="topics">Topics</option>
            <option value="notes">Notes</option>
            <option value="both">Both</option>
          </select>
          <button
            type="button"
            className={`mm-toggle-btn${find.matchCase ? " is-on" : ""}`}
            aria-pressed={find.matchCase}
            title="Match case"
            aria-label="Match case"
            onClick={() => find.setMatchCase(!find.matchCase)}
          >
            Aa
          </button>
          <button
            type="button"
            className={`mm-toggle-btn${find.useRegex ? " is-on" : ""}`}
            aria-pressed={find.useRegex}
            title="Use regular expression"
            aria-label="Use regular expression"
            onClick={() => find.setUseRegex(!find.useRegex)}
          >
            .*
          </button>
          <button
            type="button"
            className="mm-tbtn mm-tbtn-ghost"
            title="Replace the find text in every match (topics and/or notes per scope)"
            onClick={find.runReplace}
          >
            Replace all
          </button>
        </div>
        {find.matchInfo ? <span className="mm-find-info">{find.matchInfo}</span> : null}
      </form>
    </div>
  );
}
