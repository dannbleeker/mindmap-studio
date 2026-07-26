import { t } from "../../../i18n/registry";
import "../messages";
// Six short principles of mind mapping. Static content.

const PRINCIPLES: { icon: string; title: string; body: string }[] = [
  {
    icon: "◎",
    title: t("start.startCentral"),
    body: t("start.putTheSubjectInThe"),
  },
  {
    icon: "✦",
    title: t("start.oneKeywordPerBranch"),
    body: t("start.aSingleWordOrShort"),
  },
  {
    icon: "❖",
    title: t("start.radialHierarchy"),
    body: t("start.mainBranchesNearTheCentre"),
  },
  {
    icon: "🎨",
    title: t("start.colourByTheme"),
    body: t("start.giveEachMainBranchIts"),
  },
  {
    icon: "↔",
    title: t("start.crossLinks"),
    body: t("start.drawARelationshipArrowBetween"),
  },
  {
    icon: "⚡",
    title: t("start.captureThenTidy"),
    body: t("start.getEverythingDownFirstRearrange"),
  },
];

export function Learn() {
  return (
    <div className="st-content">
      <section>
        <h2 className="st-section-title">{t("start.learnMindMapping")}</h2>
        <p className="st-section-sub">{t("start.aFewPrinciplesThatMake")}</p>
      </section>
      <div className="st-principles">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="st-card st-principle">
            <div style={{ fontSize: 22, color: "var(--st-accent)" }} aria-hidden="true">
              {p.icon}
            </div>
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </div>
        ))}
      </div>

      <div className="st-card" style={{ padding: 18 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>{t("start.goDeeperTheBook")}</h3>
        <p className="st-prose" style={{ marginTop: 0 }}>
          <strong>{t("start.thinkingInMaps")}</strong> is the companion book: the why and how of
          mapping, worked examples, and every feature in context.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <a
            className="st-link"
            href="/Thinking-in-Maps.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read (PDF)
          </a>
          <a
            className="st-link"
            href="/Thinking-in-Maps.epub"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read (EPUB)
          </a>
        </div>
      </div>
    </div>
  );
}
