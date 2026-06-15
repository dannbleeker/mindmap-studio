# Mind-mapping tools → MindMap Studio: combined feature matrix

_Last updated: 2026-06-14._

A market-wide capability survey across **19 mind-mapping / visual-thinking tools**, combined into
one feature taxonomy and mapped against MindMap Studio. The companion
[`mindmanager-gap-analysis.md`](mindmanager-gap-analysis.md) is the deep, MindManager-specific
audit; **this** doc is the broader landscape — what the whole category does — and the source for
the cross-tool gap clusters at the bottom.

Snapshot of 2025/2026 feature sets, compiled from each vendor's product/help pages and reputable
comparisons. Treat version-specific details as approximate.

## Scope reminder (unchanged)

MindMap Studio is a **local-first, offline, single-user, free + open-source** brainstorming +
presentation tool. Two pillars stay **deliberately out of scope**: the **project-management
layer** (tasks/Gantt/kanban/resources/dependencies/cost/formulas) and the
**cloud/collaboration/enterprise layer** (real-time co-edit, hosted sharing, comments, accounts,
SSO, cloud sync). "Gap" below means a creation / visualisation / navigation / enrichment /
interchange capability we could reasonably own.

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Have it today |
| 🟡 | Partial / different form |
| ❌ | Missing (and feasible/interesting) |
| ⛔ | Out of scope by design (PM / collaboration / enterprise) |

---

## 1. Capture & editing
| Feature | Status | Notes / who has it |
|---|---|---|
| Keyboard tree-building (Tab/Enter/Shift-Tab/Del) | ✅ | |
| Inline edit (dbl-click / F2) | ✅ | |
| Drag-to-reparent | ✅ | |
| Undo / redo | ✅ | in-session snapshot stack |
| Rich-text + multi-line topics | ✅ | Ctrl+B/I/U |
| Free-positioned / floating topics | ✅ | |
| Quick Entry / global capture | ✅ | **Quick add** box in the header (in-app fast capture; not OS-global) |
| Brainstorm timer / ZEN focus-write | ✅ | **⏱ Brainstorm timer** (3/5/10/15-min timebox) |
| Voice / audio-memo capture | ❌ | SimpleMind, XMind |
| Paste text block → structured tree | ✅ | **📋 Paste text** dialog — outline/bullets/Markdown → topics, new map or graft |
| Drop web link → topic | ✅ | drop a link/text onto the canvas → floating topic (unsafe schemes refused) |
| Idea bank (capture-then-place) | ❌ | Ayoa |

## 2. Structure & layout (map types)
| Feature | Status | Notes |
|---|---|---|
| Radial, two-sided, left/right | ✅ | |
| Org-chart (down/up), tree | ✅ | |
| Radial/hub, timeline, fishbone | ✅ | |
| Grid / matrix (2×2 SWOT) | ✅ | grid layout tiles branches into a 2×2 |
| Node shapes (diamond/oval/parallelogram/hexagon/cylinder) | ✅ | flowchart vocabulary, canvas == export |
| Outline view | ✅ | |
| Concept map (labelled any-to-any) | ✅ | directional cross-links + template + free-canvas (🧲 Free layout) place-anywhere |
| Flowchart | ✅ | shapes + directional arrows + template + free-canvas positioning |
| Matrix / grid | ✅ | grid / matrix layout (SWOT, Eisenhower) |
| Brace / bracket map | ❌ | XMind |
| Venn / onion / swimlane | ❌ | MindManager |
| Multiple structures per branch | ❌ | XMind "skeletons" |
| True multi-root / freeform | ✅ | 🧲 Free layout: drag nodes anywhere (pos persists); floating subtrees too |
| Networked graph (multiple parents) | ❌ | TheBrain |
| Loops / cycles | ❌ | Coggle |
| Infinite freeform canvas | ❌ | Miro, Obsidian Canvas |
| Multiple sheets per file | ❌ | XMind (we have a multi-*map* library instead) |

## 3. Visual styling
| Feature | Status | Notes |
|---|---|---|
| Themes (Light/Dark/Ocean/Sunset) + dark mode | ✅ | |
| Per-branch palette colour | ✅ | |
| Per-topic fill/border/shape/bold | ✅ | |
| Organic tapered branches | ✅ | |
| Boundaries (filled, labelled) | ✅ | |
| Relationship lines (labelled, styled) | ✅ | |
| Callouts | ✅ | |
| Emoji icons / markers | ✅ | |
| Images in topics | ✅ | |
| Topic numbering | ✅ | |
| Custom fonts / sizes | 🟡 | via style; limited UI |
| Large shape library (cloud/star/diamond…) | 🟡 | box/rounded/pill only |
| Sticker / illustration library | ❌ | XMind, MindNode |
| Canvas background image/colour | 🟡 | per-map background **colour** ships (the Canvas control); background **image** ❌ |
| LaTeX / math rendering | ❌ | XMind, Freeplane, Mindomo |
| Conditional formatting (rules) | ✅ | style-by-rule (tag/marker/completion); not the SmartRules automation engine |
| Line-jumps on crossing connectors | ❌ | MindManager |

## 4. Content enrichment
| Feature | Status | Notes |
|---|---|---|
| Notes (Markdown, preview) | ✅ | |
| Web hyperlinks | ✅ | |
| In-map jump links + cross-map links | ✅ | |
| Tags (+ index + filter) | ✅ | |
| Priority/progress markers w/ data + roll-up | ✅ | task progress 0–100% rolls up to parents (+ emoji markers) |
| File attachments (arbitrary) | ✅ | inline data-URL files on a topic, capped at 5 MB |
| Audio / video embed or record | ❌ | Mindomo, Ayoa, SimpleMind |
| Checkboxes / task checkbox + roll-up | ✅ | task progress (0/25/50/75/100) with done/total roll-up |
| Dates on topics | ✅ | start/due dates, overdue highlight, due-date filter |
| Formulas / key-value attributes | ❌ | Freeplane, MindManager |
| Spreadsheet / Excel data binding | ❌ | MindManager |
| Embed live webpage / Notion | ❌ | Obsidian, Miro |

## 5. Navigation & search
| Feature | Status | Notes |
|---|---|---|
| Outline panel + filter | ✅ | |
| Find & Replace (+ `/`) | ✅ | |
| Library-wide search (all maps) | ✅ | |
| Marker/tag index | ✅ | |
| Power Filter (dim by marker/tag/text) | ✅ | |
| Auto-numbering | ✅ | |
| Minimap + zoom + fit | ✅ | |
| Collapse / expand all | ✅ | |
| Focus mode ("show branch only", dim rest) | ✅ | ◎ Focus isolates a branch |
| Fuzzy / approximate search | ✅ | Find falls back to a typo-tolerant pass |
| Saved / named filters | ✅ | name + save a Power Filter, reuse across maps |
| Bookmarks / jump-to-named-node | 🟡 | jump links cover part |

## 6. Collaboration & sharing
| Feature | Status | Notes |
|---|---|---|
| Real-time co-editing | ⛔ | conflicts with local-first / no-backend |
| Comments / discussion | ⛔ | |
| Presence cursors / follow-presenter | ⛔ | |
| Idea voting | ❌ | MindMeister, Ayoa (feasible single-user? marginal) |
| Hosted share link / publish-to-web | 🟡 | export standalone HTML/SVG/deck; no hosted link |
| Persistent version history + playback | 🟡 | **🕔 History** — per-map IndexedDB snapshots (auto + on-demand, restore-in-place, capped 30); timeline *playback* ❌ |
| Permissions / roles / SSO | ⛔ | N/A for local-first |

## 7. Import / export & integrations
| Feature | Status | Notes |
|---|---|---|
| Import .mmap, OPML, MD, JSON, .mm, Mermaid, XMind, .smmx | ✅ | strong |
| Import iThoughts, MindMeister, older .xmind, TextBundle | 🟡 | iThoughts (.itmz), MindMeister (.mind), legacy XMind content.xml all ship; TextBundle ❌ |
| Import images from .mmap blobs | ❌ | known gap |
| Export PNG/SVG/PDF/HTML/DOCX/PPTX/XLSX/deck/MD/OPML/.mm/Mermaid/XMind/.smmx | ✅ | very strong |
| Write MindManager .mmap | ❌ | |
| App integrations (Drive/Teams/Jira/Zapier/Notion) | ⛔ | mostly by design |
| Cross-device cloud sync | ⛔ | local-first |

## 8. Presentation & output
| Feature | Status | Notes |
|---|---|---|
| Presentation / Walk-Through mode | ✅ | |
| Standalone HTML slide deck + PPTX | ✅ | |
| Presenter view (map + slides) | ❌ | XMind Pitch |
| Live broadcast / audience-follow | ⛔ | MindMeister, Ayoa (needs backend) |
| Interactive published web map (filterable) | 🟡 | HTML export is static |
| AI pitch video | ❌ | XMind |

## 9. AI & automation — *the biggest market gap*
| Feature | Status | Notes |
|---|---|---|
| Prompt → map | ❌ | nearly every modern tool |
| Expand-a-branch with AI | ❌ | |
| Document / PDF / URL / YouTube / audio / image → map | ❌ | Mapify, GitMind, Ayoa, XMind |
| AI Q&A / copilot over the map | ❌ | TheBrain Cerebro, GitMind |
| AI summarise / translate / rewrite | ❌ | |
| AI image / sticker generation | ❌ | XMind |
| Scripting / macros | ❌ | Freeplane (Groovy) |

> A **keyless "copy-prompt → paste-result" bridge** (we already import OPML/Markdown, so
> paste-a-tree is half-built) or an optional bring-your-own-key path is the only AI direction
> compatible with a no-backend, privacy-first product.

## 10. Project / task management
| Feature | Status | Notes |
|---|---|---|
| Tasks / Gantt / kanban / dependencies / resources / cost | ⛔ | **locked decision: PM layer is out of scope** |

## 11. Platform & data
| Feature | Status | Notes |
|---|---|---|
| Web app / PWA, offline, installable | ✅ | |
| Local-first local files, free + open-source | ✅ | |
| Privacy (no backend / telemetry) + self-update | ✅ | a genuine differentiator |
| Native desktop app | 🟡 | PWA install; no native shell |
| Native mobile app | 🟡 | PWA in mobile browser |
| Cross-device cloud sync | ⛔ | by design |

---

## Tools surveyed (and their distinctive angle)

- **MindManager** — heavyweight desktop; full PM (Gantt/SmartRules/formulas), 20+ diagram types, HTML5 interactive export, deep Office/Teams/Jira/SharePoint.
- **XMind** — desktop+web; 240+ themes, ZEN mode, Pitch (slides + AI video), strong AI (Grow Ideas, doc/image→map), Gantt-lite.
- **MindMeister** — web; real-time co-edit, MeisterTask link, AI map-gen, presentation mode, history playback.
- **Mindomo** — web/desktop; concept maps + Gantt + outline + presentation in one, education/LMS, broad AI (text/URL/SWOT→map), widest importer list.
- **Ayoa** — organic/speed/radial/capture map types, task boards (DropTask heritage), AI YouTube/audio/doc→map, whiteboards, neuro-inclusive design.
- **Coggle** — web; real-time, unlimited branching + loops + multi-root, Markdown nodes, version history; no AI.
- **SimpleMind** — cross-platform, one-time purchase; free layout + 7 schemes, voice/video notes, your-own-cloud sync; no AI/collab.
- **MindNode** — Apple-only; Quick Entry, focus mode, visual tags, Apple-Intelligence AI + Reminders/Things sync.
- **Scapple** — freeform connect-anything board (no hierarchy); Scrivener companion.
- **Freeplane / FreeMind** — open-source desktop; Groovy scripting, conditional styles, attributes/formulas, rich export (LaTeX/Beamer/AsciiDoc), GTD/WBS add-ons.
- **MindMup** — web / Google-Drive; measurement nodes (time/money roll-up), Atlas web publishing.
- **Markmap** — Markdown→mindmap; live render in VS Code/Obsidian, MCP server for LLM generation.
- **Obsidian Canvas** — infinite canvas, cards-from-notes + backlinks, open JSON Canvas format, plugin ecosystem (AI, presentation, minimap).
- **Taskade** — 7 views on one dataset (map/board/table/calendar/…), custom AI agents, full PM hub.
- **Mapify (Chatmind)** — AI-native; anything (PDF/PPT/URL/YouTube-to-10h/audio/image-OCR)→map, copilot chat; owned by XMind.
- **GitMind** — AI generation modes, doc/URL/image/audio/YouTube→map, in-map copilot, real-time collab.
- **Whimsical** — multi-diagram canvas (map/flow/wireframe/docs), Claude-powered prompt→map + iterative expand.
- **TheBrain** — networked graph (every thought has many parents/children/jumps), Cerebro agentic AI Q&A over your knowledge graph, local-first.
- **Miro** — infinite whiteboard; mind map is one widget, AI Sidekicks, presentation, 250+ integrations.

---

## Cross-tool gap clusters (backlog candidates)

Filtering out ⛔ items, the genuinely interesting gaps cluster as:

- **A — AI assist** — the single biggest market shift; we're ~the only tool here with *none*. Only a **keyless copy-prompt/paste-result bridge** (or optional BYO-key) fits the no-backend identity. Paste-to-tree is half-built via OPML/Markdown import.
- **B — More structures** — ✅ Kanban board, summary topics, **node shapes** (diamond/oval/parallelogram/hexagon/cylinder), **directional relationship arrows**, **grid/matrix layout** (2×2 SWOT), **flowchart + concept-map templates**, and **free-canvas / whiteboard mode** (🧲 Free layout — drag nodes anywhere) all shipped. Remaining: dedicated **brace map**, **Venn/onion/swimlane** builders, and **multiple sheets per file**.
- **C — Content depth** — ✅ task progress + roll-up, start/due dates (overdue + filter), file attachments, conditional formatting, styles organizer, task priority shipped; remaining: LaTeX/math (deferred).
- **D — Capture UX (cheap wins)** — ✅ shipped: Quick add, paste-text → map, drop-link-as-topic, brainstorm timer.
- **E — Navigation polish (cheap wins)** — ✅ shipped: focus/isolate-branch, saved filters, fuzzy search.
- **F — Durability** — ✅ shipped: persistent per-map version history (IndexedDB snapshots).
- **G — Interop fills** — ✅ iThoughts/.itmz, MindMeister .mind, legacy XMind, XMind export, MindMup/Markmap import all shipped; remaining: image-bearing .mmap, write .mmap.

Most clusters are now shipped. Remaining bets: **A** (keyless AI bridge, deferred), **B** (more
diagram types — the larger structural builds), and the **C/G** long-tail (LaTeX, MindMup/Markmap, .mmap).
