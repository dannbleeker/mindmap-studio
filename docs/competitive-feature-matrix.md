# Mind-mapping tools → MindMap Studio: feature gaps

_Last updated: 2026-06-15._

A market-wide capability survey across **19 mind-mapping / visual-thinking tools**, combined into
one feature taxonomy and mapped against MindMap Studio. This doc now lists **only the gaps** — what
the category does that MindMap Studio doesn't (❌) or only partly (🟡) has, plus what's deliberately
**out of scope** (⛔). Features already shipped (✅) have been pruned; see `CHANGELOG.md` and
`docs/features.json` for the full shipped set, and the cross-tool gap clusters at the bottom for the
summary. (A MindManager-specific deep audit once lived alongside it; with its in-scope gaps closed it
was folded into `NEXT_STEPS.md` and retired.)

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
| 🟡 | Partial / different form (some of it ships) |
| ❌ | Missing (and feasible/interesting) |
| ⛔ | Out of scope by design (PM / collaboration / enterprise) |

Shipped ✅ capabilities have been removed from this doc — see `CHANGELOG.md` / `docs/features.json`.

---

## 1. Capture & editing
| Feature | Status | Notes / who has it |
|---|---|---|
| Voice / audio-memo capture | ❌ | SimpleMind, XMind |
| Idea bank (capture-then-place) | ❌ | Ayoa |

## 2. Structure & layout (map types)
| Feature | Status | Notes |
|---|---|---|
| Networked graph (multiple parents) | ❌ | TheBrain |
| Loops / cycles | ❌ | Coggle |
| Infinite freeform canvas | 🟡 | free node placement ships (🧲 Free layout); a Miro-style canvas of arbitrary objects doesn't |

## 3. Visual styling
| Feature | Status | Notes |
|---|---|---|
| Custom fonts / sizes | 🟡 | font **family** picker (Sans / Serif / Mono) + size/colour in the Info panel; no arbitrary/custom font names |
| Large shape library (cloud/star/diamond…) | 🟡 | flowchart shapes ship (diamond/oval/parallelogram/hexagon/cylinder); a big clip-art / cloud / star library doesn't |
| Sticker / illustration library | ❌ | XMind, MindNode |
| Canvas background image/colour | 🟡 | per-map background **colour** ships (the Canvas control); background **image** ❌ |
| LaTeX / math rendering | ❌ | XMind, Freeplane, Mindomo |
| Line-jumps on crossing connectors | ❌ | MindManager |

## 4. Content enrichment
| Feature | Status | Notes |
|---|---|---|
| Audio / video embed or record | ❌ | Mindomo, Ayoa, SimpleMind |
| Formulas / key-value attributes | ❌ | Freeplane, MindManager |
| Spreadsheet / Excel data binding | ❌ | MindManager |
| Embed live webpage / Notion | ❌ | Obsidian, Miro |

## 5. Navigation & search
| Feature | Status | Notes |
|---|---|---|
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
| Import images from .mmap blobs | ❌ | known gap (blocked on a real image-bearing sample) |
| Write MindManager .mmap | ❌ | low-value (open formats already bridge every tool) |
| App integrations (Drive/Teams/Jira/Zapier/Notion) | ⛔ | mostly by design |
| Cross-device cloud sync | ⛔ | local-first |

## 8. Presentation & output
| Feature | Status | Notes |
|---|---|---|
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
> compatible with a no-backend, privacy-first product. **Decided against 2026-06-15** — not worth building.

## 10. Project / task management
| Feature | Status | Notes |
|---|---|---|
| Tasks / Gantt / kanban / dependencies / resources / cost | ⛔ | **locked decision: PM layer is out of scope** |

## 11. Platform & data
| Feature | Status | Notes |
|---|---|---|
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

Clusters **B–G are shipped** — more structures (node shapes, directional arrows, grid/matrix,
flowchart + concept-map templates, free-canvas/whiteboard, brace map, onion/funnel/Venn backdrops,
per-branch layout, multiple sheets, Kanban, summary topics, cross-map copy/paste, sticky notes,
automated roll-ups), content depth, capture UX, navigation polish, durability, and interop fills
(see `CHANGELOG.md`). What's left is all **deferred or blocked**:

- **A — AI assist** — the biggest category-wide gap, but **decided against (2026-06-15)**: a
  no-backend, local-first app can only do a keyless copy-prompt → paste-result bridge (or BYO-key),
  which isn't worth building. The manual path — paste an outline / Markdown → map — already exists.
- **LaTeX / math** (from C) — deferred (heavy KaTeX + ~1 MB offline fonts).
- **Image-bearing `.mmap` import** (from G) — blocked on a real sample file.
- **`.mmap` writer** (from G) — low-value (open formats already bridge every tool).
