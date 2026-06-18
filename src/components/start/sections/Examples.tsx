import { useState } from "react";
import { buildExample, examples } from "../../../examples";
import { TemplateCard } from "../TemplateCard";
import { branchLabels } from "../nodeStats";
import type { StartContext } from "../types";

// Data-driven from examples.ts: a card for every worked example — complete, pre-filled maps that show
// the tool off across domains and features (the same set as the editor's New-map "Examples" group).
// Mirrors the Templates section; adding an example makes a card appear with no extra work. Searchable.

export function Examples({ ctx }: { ctx: StartContext }) {
  const [q, setQ] = useState("");
  const built = examples.map((e) => ({ id: e.id, name: e.name, doc: e.build() }));
  const query = q.trim().toLowerCase();
  const shown = query
    ? built.filter((e) =>
        `${e.name} ${branchLabels(e.doc).join(" ")}`.toLowerCase().includes(query),
      )
    : built;

  return (
    <div className="st-content">
      <section>
        <h2 className="st-section-title">Examples</h2>
        <p className="st-section-sub">
          Complete, worked maps — open one to explore, then make it your own. The same set as the
          editor's New-map gallery. {built.length} examples.
        </p>
      </section>
      <input
        className="st-input"
        placeholder="Search examples…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {shown.length === 0 ? (
        <div className="st-empty">No examples match "{q}".</div>
      ) : (
        <div className="st-grid">
          {shown.map((e) => (
            <TemplateCard
              key={e.id}
              name={e.name}
              doc={e.doc}
              seed={e.id}
              onOpen={() => ctx.onOpen(buildExample(e.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
