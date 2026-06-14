# MindManager → MindMap Studio: feature gap analysis

_Last updated: 2026-06-14._

> **Update (2026-06-14): the renderer-ceiling cluster is RESOLVED.** The canvas engine was
> migrated from mind-elixir to **React Flow** (mind-elixir now removed), which shipped the
> features that were previously "blocked by the renderer": **alternate layouts** (org-chart
> down/up, radial, timeline, fishbone), **organic tapered branches**, **callouts**, and
> **inline rich-text topics**. Rows below that cite the renderer ceiling are kept for history —
> treat them as **done**. The PM + collaboration/enterprise pillars remain out of scope.

A systematic audit of Mindjet MindManager's full feature set (desktop 2023–2025, Web,
Teams, Snap, Go) mapped against what MindMap Studio does today — the deeper follow-up to the
2026-06-12 UI-comparison parity pass. It exists to drive the roadmap: it says, for every
MindManager capability, whether we have it, partly have it, are blocked by the renderer, could
build it, or have deliberately ruled it out.

The MindManager inventory was compiled from Corel/Alludo's current product pages and online
help (see the sibling `NEXT_STEPS.md` and the research notes in the commit that added this
file). Our own status is read from `docs/features.json`, `README.md`, `CHANGELOG.md`, and the
renderer-ceiling notes in `NEXT_STEPS.md`.

## Scope reminder (what MindMap Studio is, and isn't)

MindMap Studio is a **local-first, offline, single-user brainstorming + presentation** tool.
Two whole pillars of MindManager are **deliberately out of scope** and will stay that way
unless that decision changes:

- **The project-management layer** — task info, Gantt, resources, dependencies, costs,
  formulas/roll-ups, dashboards, topic properties. (Explicit product decision.)
- **The cloud/collaboration/enterprise layer** — real-time co-editing, publishing, comments,
  access control, Teams/Web hosting, cloud storage, enterprise deployment, capture (Snap),
  mobile, and third-party integrations (Office/Project/Jira/SharePoint). A local-first PWA
  with no backend can't and shouldn't chase these.

So "gap" below means **a creation/visualisation/navigation/interchange capability we could
reasonably own** — not "everything MindManager has."

## Status legend

| Mark | Meaning |
|---|---|
| ✅ | **Shipped** in MindMap Studio today |
| 🟡 | **Partial** — a meaningful subset ships; more is possible |
| 🧱 | **Renderer-ceiling** — blocked by mind-elixir's renderer; needs a custom SVG renderer or an engine swap (multi-day) |
| ⬜ | **Buildable gap** — not built yet, but feasible within the current architecture + scope |
| 🚫 | **Out of scope** — deliberately excluded (PM / collaboration / enterprise / capture / native AI) |

---

## 1. Map creation & structure

| MindManager feature | Status | Notes |
|---|---|---|
| Central topic, topics, subtopics, deep nesting | ✅ | Core canvas (mind-elixir). |
| Floating topics | ✅ | Imported + editable; rendered in a labelled branch. |
| Relationships (labelled connectors) | ✅ | Cross-links / relationship arrows, two-way. |
| Boundaries (grouping enclosures) | ✅ | MindManager-style **filled box** + label chip (custom overlay). |
| Summary topics (brace over a range) | 🟡 | mind-elixir summaries exist under the hood; surfaced as boundaries, not as a roll-up-into-a-new-topic. A true "summary topic" is ⬜ buildable. |
| Callouts (annotation bubbles) | 🧱 | mind-elixir has no callout primitive — needs a custom renderer. |
| Multi-map links / topic-to-other-map | ✅ | Cross-map links (`#map=`), click to hop maps. |
| Topic-to-topic link **within** a map | ⬜ | We have relationships (visual) + cross-map links; an in-map click-to-jump hyperlink is a small add. |
| Map roll-ups (pull subtrees from many maps) | ⬜ / 🚫-ish | Feasible against the local library, but niche; low priority. |
| Sticky-note topics | ⬜ | A free-floating note style; overlaps floating topics. Minor. |
| Object shapes (arrows, chevrons, …) | 🟡 | We ship box / rounded / pill shapes; richer shape libraries are renderer-limited (🧱). |
| Auto-numbering of topics | ⬜ | Pure model transform — a genuine quick win. |
| Cut/copy/paste branches across maps | 🟡 | Within-map editing is full; cross-map branch paste is ⬜. |

## 2. Layouts & visualization

| MindManager feature | Status | Notes |
|---|---|---|
| Mind-map (radial) layout | ✅ | The default two-sided layout. |
| Layout direction (left / right / both) | ✅ | Horizontal only today. |
| Org-chart / tree-down / tree-up | 🧱 | mind-elixir has only `initLeft`/`initRight`/`initSide` — no vertical/org layout. |
| Timeline layout | 🧱 | Renderer-ceiling. |
| Fishbone / Ishikawa | 🧱 | Renderer-ceiling. |
| Flowchart / concept map (free connectors + shapes) | 🧱 | Beyond a tree renderer. |
| Funnel / matrix / Venn / onion diagrams | 🧱 / 🚫 | Different diagram engines; arguably out of the mind-map remit. |
| Kanban board view | ⬜ / 🧱 | Could be a model-driven board view (tags→columns) **without** the canvas renderer — a self-contained alternate view, medium effort. |
| Whiteboard / sticky-note canvas | 🧱 | Free-form canvas, not a tree. |
| Auto-layout / smart relationship routing | ✅ | mind-elixir auto-lays-out; our boundary/minimap overlays track it. |
| Per-branch layout override | 🧱 | Tied to the layout-engine ceiling. |

**Read:** alternate layouts are the single biggest visual gap, and they cluster under one
root cause — the mind-elixir renderer. They move together only with a renderer replacement.

## 3. Styling & design

| MindManager feature | Status | Notes |
|---|---|---|
| Themes (whole-map design) | ✅ | Light / Dark / Ocean / Sunset gallery. |
| Per-topic formatting (font, fill, border, shape, bold) | ✅ | Style bar + per-topic font size/colour/background. |
| Rich-text **inside** a topic (mixed formatting) | 🧱 | mind-elixir topics are plain text — needs a rich-text renderer. |
| Icons / markers (priority, progress, flags, …) | ✅ | Marker palette; imported `.mmap` icons → emoji. |
| Tags / tag groups | ✅ | Model supports tags (carried by importers incl. XMind labels). A tag-management UI is ⬜. |
| Conditional formatting | 🚫-ish / ⬜ | Full version is SmartRules (PM/automation, out of scope). A small "style-by-simple-rule" is ⬜ but low priority. |
| Images in topics / standalone images | ✅ | In-app image attach; `.mmap` blob import is the known gap. |
| Map background / canvas styling | ⬜ | Per-map background colour/image is a modest add. |
| Styles organizer (reusable named styles) | ⬜ | Power-user nicety; low priority for a single-user tool. |

## 4. Notes, attachments & links

| MindManager feature | Status | Notes |
|---|---|---|
| Topic notes (rich-text, searchable) | ✅ | Notes editor + Markdown preview; Find searches notes. |
| Hyperlinks (web / file / map) | ✅ | Per-node hyperlink; dangerous schemes stripped. |
| Topic info side panel | 🟡 | Notes panel covers notes; a unified info card (notes+links+tags+props) is ⬜. |
| Attachments (embed arbitrary files) | ⬜ / 🚫 | Embedding binaries in a local PWA model is possible but heavy; low priority. |
| Web-link live preview | 🚫 | Needs network fetch/proxy — against the offline-first grain. |

## 5. Task & project management / data — **🚫 out of scope (whole section)**

Task Info, resources, dependencies, task countdown, **Gantt**, schedule view, cost tracking,
**formulas / AutoCalc**, topic properties, **Excel Data Mapper**, **dashboard maps**, holiday
import, cross-map roll-ups, MS Project/Planner/To-Do/Lists sync. All 🚫 — this is the PM layer
the product deliberately excludes. (If that ever changes, Gantt + Task Info would be the entry
point, but it's a different product.)

## 6. Filtering, rules & automation

| MindManager feature | Status | Notes |
|---|---|---|
| Find / full-text search (topics + notes) | ✅ | Find & Replace, `/` shortcut, library-wide "All maps" search. |
| Power Filter (show/hide by attribute) | ⬜ | A read-only filter (by marker/tag/text) is feasible and useful; the attribute-rich version leans on PM data (🚫). |
| Marker / tag index view | ⬜ | "Show all topics with marker X / tag Y" — a buildable navigation aid. |
| SmartRules (if-this-then-that automation) | 🚫 | Automation/PM engine — out of scope. |
| Saved queries (SharePoint/Outlook/Lists) | 🚫 | Integration/PM. |

## 7. Navigation & focus

| MindManager feature | Status | Notes |
|---|---|---|
| Find / search | ✅ | See §6. |
| Focus / drill-down on a branch | ✅ | Focus mode (`scrollIntoView` + select). |
| Walk-Through (topic-by-topic) | ✅ | Present mode / Walk-Through. |
| Collapse / expand (all + per branch) | ✅ | Collapse-all / expand-all + per-node. |
| Zoom & pan | ✅ | Plus integrated **zoom controls** (−/+/%/fit). |
| **Overview / minimap** | ✅ | Shipped 2026-06-14 — corner minimap with draggable viewport (MindManager itself no longer markets one). |
| Outline view | ✅ | Outline side panel + filter. |
| Multiple views (Map/Outline/Gantt/Schedule/Icon/Tag) | 🟡 | Map + Outline ship; Gantt/Schedule 🚫; Icon/Tag index views ⬜. |

**Read:** navigation is our strongest area — at or ahead of MindManager (we ship a minimap
they've dropped).

## 8. Import / export / integration

| MindManager feature | Status | Notes |
|---|---|---|
| Native file (.mmap) import | ✅ | Field-mapped from the MindManager XSD (lossy, one-way, by design). |
| Word / PowerPoint / Excel **export** | ✅ | `.docx` / `.pptx` / `.xlsx` all ship. |
| Word / Excel **import** | 🟡 | Markdown/OPML cover outline import; direct `.docx`/`.xlsx` import is ⬜. |
| PDF export | ✅ | Print-to-PDF. |
| Image export (PNG/SVG/…) | ✅ | Native-text SVG → PNG; renders everywhere. |
| HTML / interactive web export | ✅ | Self-contained `.html` + a standalone slide deck. |
| OPML import/export | ✅ | Both ways. |
| FreeMind / Freeplane (.mm) | ✅ | Import + export (2026-06-14). |
| Mermaid mindmap | ✅ | Import + export (2026-06-14). |
| XMind (.xmind) | 🟡 | Import ✅ (2020+ `content.json`); **export** ⬜; older `content.xml` ⬜. |
| MindMup / iThoughts / SimpleMind / Markmap | ⬜ | Tracked in `NEXT_STEPS.md`; `.mm`/OPML already bridge most. |
| Office / Project / Outlook / Jira / SharePoint / Teams integrations | 🚫 | Cloud/enterprise integrations. |
| Native generative AI | 🚫 | MindManager itself ships none (add-ins only); a keyless prompt-bridge approach is the most we'd consider, and AI is deferred. |

**Read:** interchange is now broad and a genuine strength — we read/write more open formats
than most desktop tools. Remaining items are low-priority long-tail formats.

## 9. Presentation & sharing

| MindManager feature | Status | Notes |
|---|---|---|
| Slides / presentation mode | ✅ | Present mode + the HTML slide-deck export. |
| Walk-Through | ✅ | See §7. |
| Co-editing, publish, comments, access levels | 🚫 | Real-time collaboration — out of scope (no backend). |
| Web / Teams hosting | 🚫 | The app *is* a deployable static PWA, but multi-user hosting is out of scope. |

## 10. Capture & input — **🚫 out of scope (whole section)**

MindManager Snap, browser/desktop/mobile capture, team Snap queues, MindManager Go mobile.
All 🚫 — a capture pipeline + mobile companion is a separate product surface. (Quick keyboard
topic entry and `+New` templates already cover fast local capture.)

## 11. Platform & deployment

| MindManager feature | Status | Notes |
|---|---|---|
| Desktop (Win/Mac) | ✅-equivalent | Installable PWA on any OS; offline. |
| Web access | ✅ | It's a web app — live at the public URL. |
| Offline use | ✅ | Service worker + IndexedDB; fully offline. |
| Mobile companion | 🚫 / ⬜ | The PWA is responsive-ish; a dedicated mobile UX is ⬜ but low priority. |
| Cloud storage / hosted files / enterprise deployment | 🚫 | Local-first by design. |

---

## Prioritized buildable gaps (the actual roadmap signal)

Everything 🚫 is intentionally excluded. Ranked by value ÷ effort, and reconciled with what has
**shipped** since this analysis was written.

### ✅ Done since this analysis (2026-06-14)
- **Auto-numbering of topics**, **Marker / tag index view**, **Read-only Power Filter**, and
  **In-map topic-to-topic jump links** — the four original "quick wins" all shipped.
- **XMind export** and **SimpleMind (`.smmx`) import + export** shipped — interchange now spans
  `.mmap`(in)/OPML/Markdown/JSON/FreeMind/Mermaid/XMind/SimpleMind.
- **The entire 🧱 renderer-ceiling cluster** — alternate layouts (org-chart down/up, radial,
  timeline, fishbone), **callouts**, **rich-text topics**, and **organic/tapered branches** — all
  shipped via the **React Flow engine migration** (mind-elixir removed). The strategic
  "renderer or engine swap?" question is resolved: we swapped the engine.
- **Per-map background colour** (the **Canvas** control) and **one-click focus / isolate-branch**
  (the **◎ Focus** button) shipped 2026-06-14 — the first "Build-it-all" bundle.
- **Unified topic info panel** (the **ℹ Info** panel — note + markers + tags + style + links, with
  a new **tag editor**) shipped 2026-06-14 — the second bundle. Replaced the separate
  Notes/Markers/Style toggles + Link/Jump dropdowns.
- **Word `.docx` + Excel `.xlsx` import** shipped 2026-06-14 — the third bundle (outline → tree;
  docx round-trips our export and reads heading-styled docs; xlsx decodes inline + shared strings).
- **iThoughts `.itmz`, MindMeister `.mind`, and legacy XMind `content.xml` import** shipped
  2026-06-14 — the fourth bundle (three adapters; schema-verified, not yet real-file-validated).
- **Persistent version history** (the **🕔 History** panel — per-map IndexedDB snapshots, auto +
  on-demand, restore-in-place, capped at 30) shipped 2026-06-14 — cluster F from the cross-tool matrix.
- **Paste text → map** (the **📋 Paste text** dialog — outline/bullets/Markdown → topics, as a new
  map or grafted under the selection) shipped 2026-06-14 — the first slice of cluster D (capture UX).
- **Saved Power-Filter presets** (name + save a filter, reuse across maps) and **typo-tolerant Find**
  (a fuzzy fallback when nothing matches exactly) shipped 2026-06-14 — completing cluster E
  (navigation polish), alongside the earlier ◎ Focus.
- **Task progress + roll-up** (set 0–100% in the **ℹ Info** panel; a node progress bar plus automatic
  parent roll-up with a done/total count, echoed in the Outline) shipped 2026-06-14 — the first slice
  of cluster C (content depth). Stored on `task.progress`; lossless in `.json`.

### Next — remaining buildable gaps (in priority order)
1. **The last interchange items** — **image-bearing `.mmap`** (the known binary-blob gap; needs a real sample) and a **`.mmap` writer** (large XSD; can't validate without MindManager). Both are higher-risk / blocked; the easy importers are all done.
2. **True summary topics** — roll a sibling range up into its own labelled topic. NB: the original note assumed mind-elixir summaries as the base; post-migration this is now a React Flow + model feature (project a synthesised summary node over a range), so it needs re-scoping.
3. **Kanban / board view** — a model-driven alternate view (tags → columns). Borders the PM layer; keep it **read-only / tags-as-columns** (a *visualisation*, not task management) to stay in scope, or defer.
4. **Bigger bets** — AI keyless bridge, and more structures (flowchart / concept map / matrix / brace map). (Persistent version history — cluster F — shipped 2026-06-14.) See [`competitive-feature-matrix.md`](competitive-feature-matrix.md) clusters A/B.

### Bigger bets (see the cross-tool matrix)
- **AI assist** via a **keyless copy-prompt / paste-result bridge** (paste-to-tree is half-built through OPML/Markdown import) — the biggest category-wide gap; see [`competitive-feature-matrix.md`](competitive-feature-matrix.md) cluster A.
- **Persistent per-map version history** (IndexedDB snapshots) — cluster F.
- **More structures** (flowchart, true concept map, matrix, brace map, multi-sheet) — cluster B.

> For the **full market landscape** (all 19 tools, not just MindManager) and the A–G gap
> clusters, see [`competitive-feature-matrix.md`](competitive-feature-matrix.md).

## Where MindMap Studio already leads

Worth recording, because a gap analysis can read one-directionally: MindMap Studio is at or
ahead of MindManager on **open interchange** (it reads/writes `.mmap`, OPML, Markdown,
FreeMind, Mermaid, XMind, JSON, plus Office/image/HTML export — more open formats than
MindManager), on **navigation** (it ships a minimap MindManager has dropped), on **price +
privacy** (free, local-first, offline, no account), and on **being genuinely cross-platform**
from one codebase. The honest summary: we trail on **visual variety** (layouts, callouts,
rich text — all one renderer away) and we intentionally don't play in **PM, collaboration, and
enterprise**. The roadmap that follows from this doc is: pick off the quick wins, decide
deliberately about the renderer, and stay out of the two excluded layers.
