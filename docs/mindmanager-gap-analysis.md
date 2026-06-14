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
| 🧱 | **Historical** — was blocked by the old mind-elixir renderer; all such rows are now **done** (the React Flow migration resolved them — see the header note). |
| ⬜ | **Buildable gap** — not built yet, but feasible within the current architecture + scope |
| 🚫 | **Out of scope** — deliberately excluded (PM / collaboration / enterprise / capture / native AI) |

---

## 1. Map creation & structure

| MindManager feature | Status | Notes |
|---|---|---|
| Central topic, topics, subtopics, deep nesting | ✅ | Core canvas (React Flow). |
| Floating topics | ✅ | Imported + editable; rendered in a labelled branch. |
| Relationships (labelled connectors) | ✅ | Cross-links / relationship arrows with a **directional arrowhead** at the target (shipped 2026-06-14). |
| Boundaries (grouping enclosures) | ✅ | MindManager-style **filled box** + label chip (custom overlay). |
| Summary topics (bracket beside a range) | ✅ | **⊐ Summary** — a labelled, side-aware bracket beside a branch (renamable; drawn into exports). Shipped 2026-06-14. |
| Callouts (annotation bubbles) | ✅ | Anchored callout bubbles (React Flow custom node). |
| Multi-map links / topic-to-other-map | ✅ | Cross-map links (`#map=`), click to hop maps. |
| Topic-to-topic link **within** a map | ✅ | In-map jump links (`#node=`), plus relationships + cross-map links. |
| Map roll-ups (pull subtrees from many maps) | ⬜ / 🚫-ish | Feasible against the local library, but niche; low priority. |
| Sticky-note topics | ⬜ | A free-floating note style; overlaps floating topics. Minor. |
| Object shapes (arrows, chevrons, …) | 🟡 | We ship box / rounded / pill shapes; richer shape libraries are renderer-limited (🧱). |
| Auto-numbering of topics | ✅ | A view toggle (1, 1.2, …) on canvas + outline + exports. |
| Cut/copy/paste branches across maps | 🟡 | Within-map editing is full; cross-map branch paste is ⬜. |

## 2. Layouts & visualization

| MindManager feature | Status | Notes |
|---|---|---|
| Mind-map (radial) layout | ✅ | The default two-sided layout. |
| Layout direction (left / right / both) | ✅ | Horizontal only today. |
| Org-chart / tree-down / tree-up | ✅ | Org-chart ↓ / ↑ layouts (dagre). |
| Timeline layout | ✅ | Hand-written timeline layout. |
| Fishbone / Ishikawa | ✅ | Hand-written fishbone layout. |
| Grid / matrix layout (2×2 SWOT) | ✅ | Tiles the first-level branches into a grid (shipped 2026-06-14). |
| Flowchart / concept map | 🟡 | **Node shapes** (diamond/oval/parallelogram/hexagon/cylinder) + **directional arrows** + **flowchart & concept-map templates** shipped 2026-06-14. A true **free-connector canvas** (place-anywhere nodes) is still ⬜ — today's are tree-based. |
| Funnel / Venn / onion diagrams | ⬜ | Distinct diagram builders; buildable but not started. (Matrix/grid now ✅ as a layout.) |
| Kanban board view | ✅ | **▦ Board** — a read-only model-driven view grouping topics into columns by tag (shipped 2026-06-14). |
| Whiteboard / sticky-note canvas | ⬜ | Free-form canvas (not a tree); buildable on React Flow, not started. |
| Auto-layout / smart relationship routing | ✅ | Auto-layout per direction; boundary/minimap overlays track it. |
| Per-branch layout override | ⬜ | A different layout on one branch — not built. |

**Read:** the alternate-layout gap is **closed** — org-chart, timeline, fishbone, radial, and now
**grid/matrix** all ship with the React Flow engine. The flowchart/concept-map gap is **largely
closed too**: node shapes (the flowchart vocabulary), directional relationship arrows, and starter
templates all shipped 2026-06-14, so tree-shaped flowcharts and concept maps are first-class. What
remains in §2 is the genuinely *free-canvas* families — place-anywhere flowchart/concept map, a
whiteboard, and the Venn/onion/funnel/brace diagram builders — each its own build.

## 3. Styling & design

| MindManager feature | Status | Notes |
|---|---|---|
| Themes (whole-map design) | ✅ | Light / Dark / Ocean / Sunset gallery. |
| Per-topic formatting (font, fill, border, shape, bold) | ✅ | Style bar + per-topic font size/colour/background; **shape** now includes the geometric flowchart vocabulary (diamond/oval/parallelogram/hexagon/cylinder), canvas == export. |
| Rich-text **inside** a topic (mixed formatting) | ✅ | Inline bold/italic/underline/strike (contenteditable, sanitised). |
| Icons / markers (priority, progress, flags, …) | ✅ | Marker palette; **task progress pie** + **due-date chip**; imported `.mmap` icons → emoji. |
| Tags / tag groups | ✅ | Add/remove tags in the ℹ Info panel; index + filter + Board columns by tag. |
| Conditional formatting | ✅ | Style-by-rule (tag / marker / completion) via the **🎨 Styles** panel; view-only overlay. (The full SmartRules *automation* engine stays 🚫.) |
| Images in topics / standalone images | ✅ | In-app image attach; `.mmap` blob import is the known gap. |
| Map background / canvas styling | ✅ | Per-map background colour (the **Canvas** control); exports with the map. |
| Styles organizer (reusable named styles) | ✅ | Save a topic's look as a named style + reuse it (in the **🎨 Styles** panel; app-wide). |

## 4. Notes, attachments & links

| MindManager feature | Status | Notes |
|---|---|---|
| Topic notes (rich-text, searchable) | ✅ | Notes editor + Markdown preview; Find searches notes. |
| Hyperlinks (web / file / map) | ✅ | Per-node hyperlink; dangerous schemes stripped. |
| Topic info side panel | ✅ | Unified **ℹ Info** panel: note, markers, tags, progress, dates, attachments, style, links. |
| Attachments (embed arbitrary files) | ✅ | Inline data-URL files on a topic (📎 chip + download), capped at 5 MB. |
| Web-link live preview | 🚫 | Needs network fetch/proxy — against the offline-first grain. |

## 5. Task & project management / data — **🚫 out of scope (whole section)**

Resources, dependencies, task countdown, **Gantt**, schedule view, cost tracking,
**formulas / AutoCalc**, topic properties, **Excel Data Mapper**, **dashboard maps**, holiday
import, cross-map roll-ups, MS Project/Planner/To-Do/Lists sync. All 🚫 — this is the PM **engine**
the product deliberately excludes.

**Adopted from this area as lightweight topic attributes (not the PM engine):** ✅ **task progress**
(0–100% pie with parent roll-up), ✅ **start / due dates** (overdue highlight + due filter), ✅ **file
attachments**, and ✅ **task priority** (High/Med/Low chip + a priority filter) — all shipped
2026-06-14 as per-topic content, with no Gantt/scheduler. If the full PM layer were ever wanted,
Gantt + a scheduler would be the entry point — but that's a different product.

## 6. Filtering, rules & automation

| MindManager feature | Status | Notes |
|---|---|---|
| Find / full-text search (topics + notes) | ✅ | Find & Replace, `/` shortcut, library-wide "All maps" search. |
| Power Filter (show/hide by attribute) | ✅ | Read-only dim by text/marker/tag/**due-date**; saveable presets. |
| Marker / tag index view | ✅ | **📑 Index** — every marker + tag with the topics carrying it. |
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
| Multiple views (Map/Outline/Gantt/Schedule/Icon/Tag) | ✅ (in scope) | Map, Outline, Marker/Tag **Index**, and a **Board** (tags→columns) all ship; Gantt/Schedule 🚫. |

**Read:** navigation is our strongest area — at or ahead of MindManager (we ship a minimap
they've dropped).

## 8. Import / export / integration

| MindManager feature | Status | Notes |
|---|---|---|
| Native file (.mmap) import | ✅ | Field-mapped from the MindManager XSD (lossy, one-way, by design). |
| Word / PowerPoint / Excel **export** | ✅ | `.docx` / `.pptx` / `.xlsx` all ship. |
| Word / Excel **import** | ✅ | `.docx` (heading/indent outline) + `.xlsx` (indented sheet) import. |
| PDF export | ✅ | Print-to-PDF. |
| Image export (PNG/SVG/…) | ✅ | Native-text SVG → PNG; renders everywhere. |
| HTML / interactive web export | ✅ | Self-contained `.html` + a standalone slide deck. |
| OPML import/export | ✅ | Both ways. |
| FreeMind / Freeplane (.mm) | ✅ | Import + export (2026-06-14). |
| Mermaid mindmap | ✅ | Import + export (2026-06-14). |
| XMind (.xmind) | ✅ | Import (2020+ `content.json` **and** legacy `content.xml`) **and export** (`toXmind`) both ship. |
| iThoughts (.itmz) / MindMeister (.mind) / SimpleMind (.smmx) | ✅ | All import; `.smmx` also exports. |
| MindMup / Markmap | ✅ | MindMup `.mup` JSON import; Markmap imports as Markdown (frontmatter-aware). |
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
- **The rest of capture (cluster D)** — a header **Quick add** box (rapid topic entry), **drop-a-link
  onto the canvas** → floating topic, and a **⏱ brainstorm timer** — shipped 2026-06-14.
- **File attachments** — attach any file to a topic (inline data URL, 📎 chip + download in the Info
  panel, capped at 5 MB) — shipped 2026-06-14; more of cluster C / §4.
- **Board (Kanban) view** — the **▦ Board** toggle: a read-only view grouping topics into columns by
  tag (cards show progress + due; click to jump) — shipped 2026-06-14 (§2 alternate views).
- **MindMup (`.mup`) + Markmap import** — MindMup JSON maps and Markmap Markdown (frontmatter-aware);
  Markdown import now handles multi-level `#`/`##`/`###` headings too — shipped 2026-06-14 (§8).
- **Summary topics** — the **⊐ Summary** bracket: a labelled, side-aware bracket beside a branch
  (renamable; carried into exports) — shipped 2026-06-14 (§1). The last renderer-era structural gap.
- **Conditional formatting** — the **🎨 Styles** panel: rules that auto-style topics by
  tag / marker / completion (view-only overlay) — shipped 2026-06-14 (§3 styling).
- **Styles organizer** — named, reusable per-node styles (save a topic's look, apply it to others),
  in the same **🎨 Styles** panel — shipped 2026-06-14 (§3 styling).
- **Task priority** — High/Med/Low on a topic (coloured chip + a Power-Filter priority option) —
  shipped 2026-06-14 (the last cluster-C item; LaTeX is the only content-depth gap left, deferred).
- **Saved Power-Filter presets** (name + save a filter, reuse across maps) and **typo-tolerant Find**
  (a fuzzy fallback when nothing matches exactly) shipped 2026-06-14 — completing cluster E
  (navigation polish), alongside the earlier ◎ Focus.
- **Task progress + roll-up** (set 0–100% in the **ℹ Info** panel; a node completion **pie** —
  click to cycle, ✓ at 100% — plus automatic parent roll-up with a done/total count, echoed in the
  Outline + image exports) shipped 2026-06-14 — the first slice of cluster C (content depth). Stored
  on `task.progress`; lossless in `.json`.
- **Start / due dates** (set in the **ℹ Info** panel; a **📅 chip** on the node that goes red when
  overdue, a **Due date** option in the Power Filter, carried into image exports) shipped 2026-06-14 —
  more of cluster C. Stored on `task.start`/`task.due`; lossless in `.json`.

### Remaining buildable gaps (as of 2026-06-14, in rough priority order)

After this session the in-scope list is short. What's genuinely left:

1. **More diagram types** — a **flowchart / true concept map** (free connectors + place-anywhere
   nodes, beyond the tree) and **matrix / Venn / onion / funnel** diagrams. Each is its own builder;
   multi-day. (React Flow makes them *possible* now — no longer renderer-blocked — just not small.)
3. **Free-form whiteboard / sticky-note canvas** — place notes anywhere, not in a tree.
4. **Richer node shapes** (diamond / hexagon / chevron …) and **per-branch layout override** — both
   need clip-path/geometry + export work to avoid clipping text.
5. **LaTeX / math rendering** in topics/notes — the one heavy item: needs KaTeX (large JS + ~1 MB of
   offline-precached fonts) for something MindManager doesn't do natively. **Deferred by decision**
   (2026-06-14) on the offline-cache cost.
6. **Cross-map branch copy/paste** + multi-map roll-ups; **sticky-note topics** (minor).
8. **Interchange long-tail** — **image-bearing `.mmap`** import (blocked on a real sample) and a
   **`.mmap` writer** (large XSD, high-risk). *(XMind export + MindMup/Markmap import all ship.)*
9. **Dedicated mobile UX** — the PWA is responsive-ish but not phone-optimised.

### Bigger bets (see the cross-tool matrix)
- **AI assist** via a **keyless copy-prompt / paste-result bridge** (paste-to-tree is half-built
  through OPML/Markdown import + Paste-text) — the biggest category-wide gap, deliberately **deferred**;
  see [`competitive-feature-matrix.md`](competitive-feature-matrix.md) cluster A.
- **More structures** (flowchart, true concept map, matrix, Venn/funnel) — cluster B.

> For the **full market landscape** (all 19 tools, not just MindManager) and the A–G gap
> clusters, see [`competitive-feature-matrix.md`](competitive-feature-matrix.md).

## Where MindMap Studio already leads

Worth recording, because a gap analysis can read one-directionally: MindMap Studio is at or
ahead of MindManager on **open interchange** (it reads/writes `.mmap`, OPML, Markdown,
FreeMind, Mermaid, XMind, JSON, plus Office/image/HTML export — more open formats than
MindManager), on **navigation** (it ships a minimap MindManager has dropped), on **price +
privacy** (free, local-first, offline, no account), and on **being genuinely cross-platform**
from one codebase. The visual-variety gap that this doc once led with (layouts, callouts,
rich text, summary topics) is **closed**. The honest summary now: we trail only on a few **non-tree
diagram types** (flowchart / concept map / matrix / Venn / funnel) and we intentionally don't play in
**PM, collaboration, and enterprise**. The roadmap that follows: build the remaining diagram types as
the appetite arises, and stay out of the two excluded layers.
