import { buildExample, examples } from "../../examples";
import { templates } from "../../templates";
import { buildTemplate } from "../../templates";
import { CaptureCard } from "./CaptureCard";
import { MapCard } from "./MapCard";
import { TemplateCard } from "./TemplateCard";
import { blankDoc, outlineDoc, topicDoc } from "./docBuilders";
import { handleMapAction } from "./mapActions";
import type { StartContext } from "./types";
import { useLibrary } from "./useLibrary";

// The default "Start" section: capture hero + "pick up where you left off" (3 most-recent maps) +
// "start from a template" (the first 4 non-blank templates). Recent hides itself when empty.

export function StartHome({ ctx }: { ctx: StartContext }) {
  const recent = [...useLibrary(ctx.libraryRev)]
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, 3);
  const featured = templates
    .filter((t) => t.id !== "blank")
    .slice(0, 4)
    .map((t) => ({ id: t.id, name: t.name, doc: t.build() }));
  const featuredExamples = examples
    .slice(0, 4)
    .map((e) => ({ id: e.id, name: e.name, doc: e.build() }));

  return (
    <div className="st-content">
      <CaptureCard
        onTopic={(text) => ctx.onOpen(topicDoc(text))}
        onPaste={(text) => {
          const d = outlineDoc(text);
          if (d) ctx.onOpen(d);
        }}
        onBlank={(layout) => ctx.onOpen(blankDoc(), layout)}
      />

      {recent.length > 0 ? (
        <section>
          <div className="st-row">
            <h2 className="st-section-title">Pick up where you left off</h2>
            <button type="button" className="st-link" onClick={() => ctx.go("all")}>
              View all maps →
            </button>
          </div>
          <div className="st-grid" style={{ marginTop: 12 }}>
            {recent.map((e) => (
              <MapCard key={e.id} entry={e} onAction={(a, en) => handleMapAction(a, en, ctx)} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="st-row">
          <h2 className="st-section-title">Start from a template</h2>
          <button type="button" className="st-link" onClick={() => ctx.go("templates")}>
            Browse all templates →
          </button>
        </div>
        <div className="st-grid" style={{ marginTop: 12 }}>
          {featured.map((t) => (
            <TemplateCard
              key={t.id}
              name={t.name}
              doc={t.doc}
              seed={t.id}
              onOpen={() => ctx.onOpen(buildTemplate(t.id))}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="st-row">
          <h2 className="st-section-title">Or open a worked example</h2>
          <button type="button" className="st-link" onClick={() => ctx.go("examples")}>
            Browse all examples →
          </button>
        </div>
        <div className="st-grid" style={{ marginTop: 12 }}>
          {featuredExamples.map((e) => (
            <TemplateCard
              key={e.id}
              name={e.name}
              doc={e.doc}
              seed={e.id}
              onOpen={() => ctx.onOpen(buildExample(e.id))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
