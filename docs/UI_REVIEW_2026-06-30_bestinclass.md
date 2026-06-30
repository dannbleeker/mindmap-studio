# Fresh UI review — best-in-class features (2026-06-30)

A second, features-focused review with fresh eyes — run *after* the UI-1…UI-7 remediation + tails
shipped. Where the [June research report](UI_RESEARCH_2026-06-30.md) targeted *polish* (chrome, a11y,
density), this one asks a different question: **what best-in-class capabilities would elevate the
product**, filtered hard against the as-built feature set and the decided-against list.

Method: a multi-lens scan — an as-built code inventory + external best-in-class lenses (competitor
feature teardown, knowledge-structure/navigation, input/capture, presentation/sharing, and a deep dive
on interactive offline HTML export). Every "already shipped" claim below is checked against the code;
every proposed feature is checked for offline (no-backend) feasibility before it's listed.

---

## The honest headline

**This is no longer a "what's missing" exercise.** The inventory turned up ~180 shipped capabilities.
The app already has the large majority of every competitor's feature set *and* several genuinely
**best-in-class strengths** that most rivals can't match:

- **Local-first + fully offline, no account, no telemetry** — rare in this category; the core identity.
- **MindManager `.mmap` round-trip completeness** (rich text, icons→emoji, tasks, relationships,
  boundaries, callouts, per-topic styling all survive) — better interop than most.
- **Conditional styling / SmartRules** (render-time auto-formatting by tag/marker/priority/completion,
  never baked) — unusual for an offline app.
- **Canvas == export fidelity** (SVG/PNG/PDF/PPTX render identically to screen, documented + tested).
- **WCAG 2.2/2.5 maturity** with assertions in CI (incl. the `role="tree"` outline + SR relationships
  list from this month's work).
- **Presenter view** (speaker notes + clickable agenda + next-slide), **version-history playback**,
  **13-format import/export with per-format lossy notes**, and a genuinely-working **responsive/touch**
  build.

So "best-in-class features to add" is a **short, high-quality list** — most apparent gaps are either
already shipped or consciously decided-against. The recommendations below are filtered to: *genuinely
not present, in-scope (no backend), and worth the effort*.

---

## Already shipped — NOT re-pitched (verified in code)

A best-in-class review usually proposes these; this app already has them, so they're off the list:
focus-mode/drill-into-subtree (`useFocusHotkey`, `drillId`), **saved views/perspectives**
(`savedViews.ts`: viewport+drill+filter), **detail-level folding** ("Show detail level 1–5" / collapse-
expand-all in ⌘K), summaries + boundaries + callouts (first-class model types), outline numbering
(decimal/legal), breadcrumb + minimap, **per-node backlinks / "Linked-from"** in the inspector,
marker/tag index panel, Power Filter + saved filters, cross-map + in-map fuzzy search with Find
Next/Prev, an **already-editable Outline panel** (inline rename, drag-reorder, ◂▸ indent, Tab/Enter
add), **image-paste** onto a node, **paste-text→map** (bullets / indentation / `#` headings), conditional
styling, Kanban, presenter notes/agenda, 8 layouts + free canvas, roll-ups, the **brainstorm timer**, the
new contextual action bar + accessible tree, and a `⌘K` command palette.

---

## Best-in-class features worth adding (ranked)

### Tier 1 — high impact, in-scope, genuinely missing

**1. Interactive offline HTML export (single self-contained file).**
*What:* "Export → Interactive HTML" produces **one `.html` file** you can email that opens in any browser
**fully offline** (no server, no CDN) and lets the recipient **pan, zoom, and expand/collapse the real
map** — not a static image, not a text outline. *Best-in-class:* only **markmap `--offline`** and
**MindMup Atlas** actually do this; **XMind's HTML is a static snapshot, and Coggle / Whimsical / Miro
are static-image or hosted-link-only** (their interactive view needs their backend). So this is a place
the app could *lead*, not catch up. *Fit:* dead-on for a local-first, no-account app — it's the missing
**share** verb. Mechanics are proven and zero-network: inline the renderer (d3 + a small view layer, the
markmap/D3-collapsible-tree model) into the file and embed the tree as an inline JSON literal; the app
already serialises the model and already owns "canvas == export fidelity", so this extends the existing
export suite rather than inventing a new surface. *Impact: high · Effort: M.*

**2. Jump-to-node quick switcher.**
*What:* a `⌘P`-style fuzzy switcher that lists every node title in the map → type a few letters → jump +
select it. The map-navigation analogue of an editor's "Go to file". *Best-in-class:* VS Code/Obsidian
quick-open; XMind/Notion node search. *Fit:* trivially local (fuzzy match over the in-memory doc) and a
natural extension of the existing `⌘K` palette — arguably the highest delight-per-effort item here on big
maps. *Impact: high · Effort: S.*

**3. Promote a branch to its own map ("New map from topic") + merge a map in as a branch.**
*What:* right-click a subtree → spin it out into a new standalone library map (optionally leaving a
cross-map link), and the inverse — drop a library map in as a branch. *Best-in-class:* XMind ("New Sheet
from Topic", Ctrl+Alt+T) + MindManager Map Parts. *Fit:* clean + fully local — today `detachBranch` only
pops a subtree to a *floating topic in the same map* (`ops.ts`), and the multi-map library + roll-ups
already exist, so this is the missing reuse/restructure verb. *Impact: high · Effort: M.*

**4. Map-wide Relationships / Links panel.**
*What:* a dockable list of every relationship arrow + cross-node hyperlink (from → to, label, type),
filterable, click-to-jump — a map-level index of the *link layer*, not just the selected node's
backlinks. *Best-in-class:* Obsidian's backlinks/outgoing panes; TheBrain centres the link layer.
*Fit:* the per-node data exists (`doc.links[]`, `#node=` hyperlinks, `backlinksFor` in `outline.ts`);
the delta is a map-level panel beside the existing Outline/Index docks. *Impact: high · Effort: M.*

**5. Unified scoped search query (`tag:` `marker:` `has:note` `level:` + free text).**
*What:* one search box that parses field operators, so `tag:#risk -task has:note` narrows in a single
expression instead of juggling regex-Find + the separate Power-Filter chips. *Best-in-class:* Obsidian's
search/backlink operator grammar. *Fit:* the predicates already exist (`FilterCriteria` in `filter.ts`,
`findDocMatches`) — this is a string→predicate parser over the in-memory doc, zero network. Unifies the
two search surfaces the app already has. *Impact: high · Effort: M.*

### Tier 2 — strong, smaller, or a judgment call

**6. Smart-paste enrichment (lead with paste-a-URL → titled node).** Today paste-text→map handles
bullets/indent/`#`. Add: paste a **URL → a node titled from the URL** (derive a readable title from
`URL.pathname` — slug→Title Case — **no fetch**, fully offline); paste a **TSV/table → subtree or sibling
set**; paste rich HTML → structured nodes. *Best-in-class:* Workflowy/Notion paste intelligence. *Fit:*
pure client clipboard parsing; the URL case alone is a cheap, high-value win for research/clipping flows.
*Impact: high (URL case) · Effort: S–M.*

**7. Big-map virtualisation (render only visible nodes).** On thousand-topic maps, render/measure only
what's in (or near) the viewport so pan/zoom/edit stays smooth. *Best-in-class:* TheBrain/Heptabase keep
huge graphs fluid; React-Flow exposes `onlyRenderVisibleElements`. *Fit:* the renderer sits behind
`contract.ts`/`buildFlowState`, so this is contained; it's the purest enabler of "serious maps at scale"
and the one item that protects every other feature as maps grow. *Impact: high · Effort: L.*

**8. Presentation aids + cinematic walkthrough.** Small, high-value win: a **per-slide presenter
timer/countdown** + green→red **pacing** colour + "**B** to black the screen" (the app has a *brainstorm*
timer, not a *presenter* one). Reference model is reveal.js' speaker view (per-slide + total countdown,
pacing colour); a second presenter window is achievable offline via `window.open()` + `BroadcastChannel`.
Bigger swing: a **cinematic Prezi/XMind-Pitch-style zoom walkthrough** (smooth pan-zoom node→node) as an
alternative to step-through — **confirmed feasible in React Flow** via `setViewport`/`fitBounds` with a
`duration`, storing each step as `{x,y,zoom}`. *Timer/pacing: S · Cinematic: M–L (needs-decision).*

**9. Zen / distraction-free edit mode.** One-key toggle that hides all chrome (rails, toolbars, panels,
tabs), leaving only the canvas. *Best-in-class:* XMind ZEN. *Fit:* trivially local — CSS state hiding
chrome + a hotkey; the app has Focus-a-branch and Present mode but no chrome-free *edit* mode. *Medium ·
S* — high delight-per-effort.

**10. Quick-capture inbox.** A fast, low-friction "jot it now, file it later" entry (global hotkey or a
small capture box) that drops loose thoughts into an **Unfiled** bucket you triage onto the map later.
*Best-in-class:* MindNode Quick Entry; the GTD inbox pattern. *Fit:* pure-local; complements brainstorming
("capture the flood, organise after"). *Medium · M.*

**11. Node slash-commands.** Type `/` inside a node → a menu to insert an icon/marker, a link, a note, a
child, a boundary, etc. — the actions exist; this is a faster keyboard-first surface for them.
*Best-in-class:* Notion/Slack slash menus. *Medium · M.*

**12. Tags-as-navigation pane.** Make tags a first-class nav surface: a tag list with counts →
click-to-filter-and-jump across the subtree, building on the existing `markerTagIndex` + stable per-tag
colours. *Medium · S.*

**13. Dedicated full-pane outliner mode.** The Outline *side panel* is already a real editing surface; the
delta vs XMind/MindNode is a roomy, full-width two-pane outliner view (inline notes/markers, multi-line)
for long-form structuring. *Medium · M.*

### Tier 3 — nice, needs a product call

- **Node emoji picker + branch-tinted stickers** (MindNode's signature). The model already carries
  `icons: string[]` + node images; system emoji are zero-asset text. *needs-decision · M.*
- **Natural-language date entry** for task due-dates (type "next fri" → a resolved date) via `chrono-node`
  (MIT, fully offline). *Best-in-class:* Notion's `@`-date. The task layer is deliberately light, so this
  is a *judgment call*, not a PM-engine creep. *needs-decision · S.*
- **Smart checkbox roll-up trigger** (SimpleMind): auto-promote a parent to a progress bar the moment 2+
  children gain checkboxes — the roll-up math exists, only the *auto-trigger* is missing. *needs-decision
  · S.*
- **Markdown note → lightweight knowledge base** (Heptabase): richer markdown note cards + surfaced
  backlinks so a map doubles as a small KB. Half-present (notes + Linked-from). *needs-decision · M.*

---

## Stays decided-against (no change recommended)

The rough-edge scan surfaced these; all are existing, sound decisions for a no-backend local-first app —
listed so they're not mistaken for oversights: real-time collaboration / multiplayer; a networked/cyclic
multi-parent graph (TheBrain-style); the project-management engine (Gantt, dependencies, resources,
formulas, custom attributes); AI assist; voice/audio capture; LaTeX/math; arbitrary custom fonts;
true split-pane multi-map editing; an infinite Miro-style object canvas; live web/data embeds; and any
**hosted** share link (Coggle/Whimsical/Miro model) — the interactive-HTML export above is the
local-first answer to the same need.

---

## Recommended slice (if you build)

Two compounding, all-in-scope, no-backend bundles — pick by what you want to push:

- **"Share & present" pack** — **(1) interactive offline HTML export + (8) presenter timer/pacing +
  cinematic walkthrough**. This is the differentiated one: it turns a finished map into something you can
  *send* and *present*, in a way the hosted competitors can't match offline. Start with the HTML export
  (the standout), add the presenter timer (S) as a cheap, immediate win.
- **"Serious maps" pack** — **(3) promote-branch-to-map + (4) relationships panel + (5) scoped search +
  (7) virtualisation**, with **(2) jump-to-node** and **(9) Zen mode** as the cheap wins alongside.
  Together they target the one place this otherwise-complete app still trails best-in-class — *working
  fluidly with large, structured, interconnected maps* — without touching any decided-against territory.

If you build only three things: **jump-to-node (S)**, **paste-URL→title (S)**, and **interactive HTML
export (M)** — the two cheapest high-value wins plus the one genuinely-differentiating capability.

## Sources

Inventory is code-grounded (this repo). External lenses: XMind (New Sheet from Topic, ZEN, Pitch),
MindNode (stickers, Quick Entry), SimpleMind (smart roll-up), Obsidian (search/backlink operators, tag
pane, quick-open), Heptabase (markdown cards + backlinks), TheBrain (link-centred graph), Notion
(slash menu, `@`-date / chrono-node), Workflowy/Notion (paste intelligence), Prezi / XMind Pitch / Miro
(cinematic present), reveal.js / Keynote / PowerPoint (presenter timer + pacing).

Interactive-HTML-export finding (cited): **markmap `--offline`** inlines d3 + markmap-view and embeds the
tree as inline JSON for a zero-network single file
([markmap-cli docs](https://markmap.js.org/docs/packages--markmap-cli),
[offline discussion #233](https://github.com/markmap/markmap/discussions/233)); **MindMup Atlas** emits a
self-contained interactive HTML file ([MindMup Atlas](https://www.mindmup.com/help/features/mindmup-atlas/));
**XMind HTML is a static snapshot** (no drill-down) — staff recommend exporting SVG as the web workaround
([XMind export thread](https://support.xmind.net/hc/en-us/community/posts/30051271565465-Export-to-HTML));
**Coggle** exports PDF/PNG only ([formats](https://coggle.help/article/105-supported-export-formats)),
**Whimsical** exports PNG/PDF/SVG only ([exporting](https://help.whimsical.com/imports-exports/exporting-from-whimsical)),
**Miro** is hosted-only with no offline mode
([board access](https://help.miro.com/hc/en-us/articles/360017572194-Board-access-rights)); the
**D3 collapsible+zoomable tree** is the canonical DIY template for the same single-file result
([D3 collapsible tree](https://observablehq.com/@d3/collapsible-tree),
[Schmuecker zoomable tree](https://www.robschmuecker.com/d3-js-drag-and-drop-zoomable-tree/)).

*Method note: the as-built inventory + best-in-class scan ran as a multi-agent fan-out; findings were
re-checked against the code so "already shipped" items (focus mode, saved views, detail-level folding,
editable outline, paste-text→map, summaries, numbering, backlinks) were excluded from the recommendations
rather than re-pitched.*
