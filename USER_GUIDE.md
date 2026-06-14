# MindMap Studio — User Guide

A local-first, offline mind-mapping app — a self-hosted replacement for Corel/Mindjet
MindManager. Your maps live in your browser (IndexedDB) and on disk; there are no accounts
and no telemetry.

This guide covers everything in the toolbar, top to bottom. For what changed recently see
[`CHANGELOG.md`](CHANGELOG.md); for how the project is built see [`README.md`](README.md).

---

## Getting started

1. `pnpm install`
2. `pnpm dev` and open the printed URL (dev server `mindmap-dev`, port 5175).
3. You'll see a sample map (**Q3 Retail Plan**) showing off notes, markers, a relationship
   arrow, and a boundary. Click around, or start your own with **+ New…**.

Everything autosaves to your browser as you work, and the last map you had open — along with
the side panels you had open (Notes, Outline, Markers, Style) — is restored next time. It also
works fully offline and can be installed (see [Install as an app](#install-as-an-app)).

---

## The toolbar

Left to right:

| Control | What it does |
|---|---|
| **☰ Outline** | Toggle the [outline panel](#outline-panel) |
| **📑 Index** | Toggle the [marker & tag index](#marker--tag-index) |
| **🎚 Filter** | Toggle the [Power Filter](#power-filter) (dim non-matching topics) |
| **+ New…** | Create a map from a [template](#templates) (Blank, Brainstorm, SWOT, Project, 5 Whys, Decision, Retrospective, Meeting, Pre-mortem) |
| **(map dropdown)** | Switch between maps in your [library](#the-map-library) |
| **Delete** | Delete the current map |
| **▶ Present** | Start [presentation mode](#presentation-mode) |
| **Fit** | Scale + center the map in the viewport |
| **⊟ / ⊞** | [Collapse / expand all](#collapse--expand) branches |
| **1. Numbering** | Toggle [outline numbering](#auto-numbering) (1, 1.2, …) on every topic |
| **📝 Notes** | Toggle the [notes editor](#notes) |
| **🏷 Markers** | Toggle the [marker palette](#markers) |
| **🎨 Style** | Toggle the [style bar](#per-topic-styling) |
| **Find / Replace** | [Search and replace](#find--replace) topics & notes (`/` jumps here) |
| **Theme** | [Canvas theme](#themes): Light / Dark / Ocean / Sunset |
| **Layout** | [Layout direction](#layout): Both sides / Right / Left |
| **⬆ Export…** | Save the map in any format — see [Exporting](#exporting) |
| **⬇ Backup** | [Back up](#backup--restore) the whole library to one file |
| **Open files** | [Import](#importing) one or many files |

---

## Editing the map

Keyboard-first, just like MindManager:

- **Enter** — add a sibling topic
- **Tab** — add a child topic
- **Ctrl + Enter** — add a parent
- **Delete** — remove the selected node
- **Double-click** a node — edit its text (or just start typing on a selected node)
- **Ctrl + B / I / U** — while editing a topic: bold / italic / underline the selection
- **Drag** a node onto another — re-parent it
- **Ctrl + Z / Ctrl + Shift + Z** (or Ctrl + Y) — **undo / redo** (kept in sync with what's saved)
- Right-click a node for the full context menu (add/remove, summary, link, focus mode, move up/down)

Edits you make on the canvas — adding, renaming, moving, restyling — are captured into the map's
underlying model, so the outline, every export, and the autosave always reflect your latest changes.

### Notes

Open **📝 Notes**, select a node, and write in the docked editor. Notes autosave as you type
and travel with the map (including the lossless `.json` export). Click **Preview** to render
the note as **Markdown** — headings (`#`), `**bold**`, `*italic*`, `` `code` ``, `- bullet
lists`, and `[links](https://…)` are supported. Nodes that have a note show a 📝 in the
[outline](#outline-panel).

### Markers

Open **🏷 Markers** and click a marker (✅ ❗ ⭐ 🚩 priority numbers, …) to toggle it on the
selected node. Imported MindManager icons are mapped to these glyphs automatically.

### Images

Click **Image**, pick a picture, and it's attached to the selected node. Images are
downscaled and stored inside the map (as a data URL), so they stay offline and travel with a
`.json` export.

### Per-topic styling

Open **🎨 Style** and, with a node selected:

- **Shape** — Box, Rounded, or Pill
- **Fill** — a swatch, or ✕ for none
- **Border** — a colour swatch, or ✕ for none
- **B** — bold; **Reset** clears all styling

(Font size and colour also live in the node editor panel that appears when you select a node.)

### Rich-text topics

Per-topic styling restyles the *whole* node; rich text formats *part* of the topic. While
editing a topic, press **Ctrl + B**, **Ctrl + I**, or **Ctrl + U** to bold, italic, or
underline — select the characters first, or toggle the format on and keep typing. The
formatting is saved with the map and travels in the `.json` export. The plain text is always
kept alongside it, so the outline, Find, and the Markdown/Office exports stay clean and readable.

### Links

Select a node and use the node editor panel's **URL** field to attach a web hyperlink.

To link a node to **another map**, select it and pick a map from the **🔗 Link…** dropdown
in the toolbar. The node shows a 🔗 — click it to jump to that map. (Pick **✕ Remove link**
to clear it.) This lets you build a connected web of maps.

---

## Navigating

### Outline panel

**☰ Outline** opens a live, indented outline of the whole map. Click any row to jump to that
node on the canvas. The **Filter outline…** box narrows the list to matching topics; 📝 marks
noted nodes.

### Auto-numbering

**1. Numbering** prefixes every topic with its hierarchical outline number — `1`, `1.2`,
`1.2.3`, and so on — both on the canvas and in the Outline panel, and the numbers carry through
to image, PDF, and Office exports. The central topic is the implicit "0" and stays unnumbered.
It's a view toggle: the numbers are derived from the tree's shape, never written into your topic
text, so turning it off leaves your topics exactly as they were and search/exports stay clean.
Handy for referring to a specific node by number ("see 3.2") in a meeting or a written summary.
The setting is remembered between sessions.

### Marker & tag index

**📑 Index** opens a side panel that gathers every [marker](#markers) and [tag](#markers) used
anywhere in the map, grouped by marker/tag with a count and the list of topics carrying it. Click
any topic to centre and select it on the canvas. It's the read-only counterpart to the **Markers**
palette: the palette *applies* markers to a node, the index *finds* every node that already has one
— handy for "show me everything flagged ❗" on a big map.

### Power Filter

**🎚 Filter** opens a read-only filter that **dims** every topic except the ones that match your
criteria — and the branches leading to them, so each match keeps its context. Combine a free-text
search (matches topic **and** note) with toggle chips for any marker or tag in the map; marker/tag
criteria are combined with AND (a topic must satisfy each category you've set). A live count shows
how many topics matched. It changes nothing in the map — **Clear** or closing the panel restores
everything — so it's a safe way to focus a crowded map on, say, every urgent (❗) item mentioning
"budget". (This differs from **Find**, which steps you through matches one at a time, and the
**Filter outline…** box, which narrows the outline list.)

### Find & Replace

Type in **Find** to jump between matching topics **and notes** — press **Enter** repeatedly to
cycle hits (an `n/total` counter shows where you are). Type in the **Replace** box and click
**Replace all** to rewrite the search text across every matching topic. Press **`/`** anywhere
(when you're not typing) to jump straight to Find.

### Search all maps

**🔎 All maps** (in the header) searches your whole library at once — every map's topics and
notes, including floating topics. Pick a result and it opens that map and focuses the node
(if the match is in the current map, it jumps straight there). Handy once the library grows
into a connected knowledge base.

### Collapse / expand

**⊟** collapses every branch to a level-1 overview; **⊞** expands the whole tree. **Fit**
re-frames the map.

### Minimap & zoom

A **minimap** in the bottom-right corner shows a shrunk overview of the whole map with a
rectangle marking the part you're viewing. **Click or drag** inside it to pan the main canvas
there. Below it, the zoom controls — **−**, a live **percentage**, **+**, and **⤢ fit** — give
precise, stepped zoom (the mouse wheel zooms too). Handy for orienting on a large map and for
lining one up before a screenshot or screen-share. When the overview is in the way, the
**Minimap ▾** button collapses it (click **Minimap ▴** to bring it back); the choice is remembered.

### Layout

The **Layout** dropdown changes how the whole map is arranged; the choice is remembered and the
map re-flows into the new shape without losing any edits:

- **Both sides / Right / Left** — the classic radial map, branches on both sides of the root or
  pushed all to one side.
- **Org-chart (down / up)** — a top-down (or bottom-up) hierarchy, like a reporting tree.
- **Radial** — branches fan out evenly in a ring around the root.
- **Timeline** — the first level laid left-to-right as a sequence; good for roadmaps and steps.
- **Fishbone** — an Ishikawa cause-and-effect diagram, branches angling into a central spine.

### Themes

The **Theme** dropdown restyles the whole canvas — **Light**, **Dark**, **Ocean**, **Sunset** —
live, without losing edits. Image exports inherit the theme, so a dark map exports dark.

---

## Relationships, boundaries & callouts

- **Relationships** — draw a labelled arrow between two nodes: right-click the first node →
  **Link to…**, then click the target (you'll be prompted for an optional label). Double-click a
  relationship to relabel it, right-click it to delete. Drawn and imported (`.mmap`) relationships
  both persist.
- **Boundaries** — a shaded, rounded box grouping a node and its subtree. Select a node and
  click **⬚ Group** in the toolbar, then double-click the box's label chip to name it (an
  unlabelled box shows a "Label…" placeholder). Drawn and imported boundaries both round-trip
  and persist.
- **Callouts** — a small sticky-note annotation pinned beside a node. Right-click a node →
  **Add callout**, then double-click the bubble to edit its text (the **×** removes it). Callouts
  are saved with the map and are drawn into the image exports too.
- **Floating topics** — detached topics imported from `.mmap` appear in a "Floating topics"
  branch; edit them like any node (rename, add, remove, or drag in/out of the tree) and the
  changes are saved.

---

## The map library

Every map you create or import is kept in the browser, keyed by name in the **map dropdown**.
Switch freely; each is autosaved. **Delete** removes the current one.

### Templates

**+ New…** offers starter maps: **Blank**, **Brainstorm** (the 5 Ws + How), **SWOT**,
**Project plan**, **5 Whys** (a nested root-cause chain), **Decision** (pros & cons),
**Retrospective** (Start / Stop / Continue), **Meeting notes**, and **Pre-mortem**.

### Examples

The same **+ New…** menu has an **Examples** group: 13 *complete*, worked maps to open and
adapt — Product launch plan, Meeting notes, Decision log, Quarterly OKRs, Team retrospective,
a worked SWOT, Incident runbook, GTD natural planning, Talk/content outline, Personal
knowledge map, Study/revision map, Trip plan (with an image), and a Cross-map atlas. Unlike
templates (empty frames), examples are filled in — the quickest way to see a finished map and
learn a feature by reading one that uses it. Opening one creates a fresh, editable copy.

---

## Importing

**Open files** accepts (and you can multi-select to **batch-import** a whole folder):

| Format | Notes |
|---|---|
| `.mmap` | MindManager export — recovers topics, notes, icons, hyperlinks, relationships, boundaries, floating topics (one-way, lossy by design) |
| `.md` / `.markdown` | Markdown outline (H1 root + nested bullets) |
| `.json` | A native MindMap Studio map — **lossless** |
| `.opml` | OPML outline (Freeplane, OmniOutliner, Workflowy, …) |
| `.mm` | FreeMind / Freeplane map — topics, links, folded state, and notes |
| `.mmd` / `.mermaid` | Mermaid `mindmap` text (any node shape; hierarchy by indentation) |
| `.xmind` | XMind (2020+) — topics, notes, web links, and labels→tags from `content.json` |
| `.smmx` | SimpleMind — topic tree, notes, web links, and relations→cross-links |

Each imported file becomes its own library entry; batch imports report how many were added.
MindManager stock icons are mapped to the closest **emoji** marker, so an imported map keeps its
visual cues rather than arriving as bare text.

### Backup & restore

**⬇ Backup** saves your entire library — every map — into a single `mindmap-library.json`.
To restore, just **Open** that file: all the maps come back. Great for moving your whole
library to another machine or keeping a safe copy.

---

## Exporting

Pick a format from the **⬆ Export…** menu:

| Format | Output |
|---|---|
| `.json` | Native, **lossless** — use for backup or moving a map between machines |
| `.md` | Markdown outline |
| `.opml` | OPML outline |
| `.mm` | FreeMind / Freeplane — topics, links, folded state, notes (opens in FreeMind, Freeplane, XMind, …) |
| `.mmd` | Mermaid `mindmap` text — paste into Markdown, GitHub, or docs that render Mermaid |
| `.xmind` | XMind (2020+) — topic tree, notes, links, tags, plus floating topics + relationships |
| `.smmx` | SimpleMind — topic tree, notes, web links, relations, plus floating topics |
| `.png` / `.svg` | Image of the map (inherits the current theme) |
| `.html` (standalone) | A single self-contained HTML file — the whole map as an image (opens anywhere, offline) |
| `.html` (slide deck) | A standalone, navigable slide presentation — the [Walk-Through](#presentation-mode) as a shareable file (arrow keys / click / Prev-Next, offline) |
| `.docx` | A Word document — the map as an editable, indented outline (opens in Word, LibreOffice, Pages, Google Docs) |
| `.pptx` | A PowerPoint deck — an overview slide, then one per branch (opens in PowerPoint, Keynote, LibreOffice, Google Slides) |
| `.xlsx` | An Excel worksheet — the map as an indented outline (a column per depth) with a Notes column (opens in Excel, LibreOffice Calc, Numbers, Google Sheets) |
| `.pdf` | Opens your browser's print dialog → "Save as PDF" (landscape) |

Or **⧉ Copy outline** copies the map as a Markdown outline straight to the clipboard — no
file — for pasting into an email, chat, or doc.

---

## Presentation mode

**▶ Present** opens a fullscreen **Walk-Through**: an overview slide, then one slide per
branch with its nested points. Navigate with **Prev / Next**, the **arrow keys**, and **Esc**
to exit.

To share the same walk-through without the app, export it as a **slide deck** — the
`.html (slide deck)` option in the **⬆ Export…** menu saves a standalone, navigable HTML file
that opens in any browser, offline.

---

## Install as an app

MindMap Studio is an installable PWA: your browser will offer to install it to your desktop /
home screen, after which it launches in its own window and runs fully offline (the app shell
is precached).

When a new version is deployed, the running app shows a quiet **"A new version is available —
Refresh now"** prompt; click it to swap to the new build and reload. It never reloads on its
own, so an in-flight edit is never lost. You can also force a check via **About → Check for
updates**.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Enter | Add sibling |
| Tab | Add child |
| Ctrl + Enter | Add parent |
| Delete | Remove node |
| Ctrl + B / I / U (while editing) | Bold / italic / underline the selection |
| Ctrl + Z / Ctrl + Shift + Z / Ctrl + Y | Undo / redo |
| `/` | Focus Find |
| Enter (in Find) | Next match |
| Arrow keys / Esc (in Present) | Navigate / exit slides |

---

## Notes on scope

MindMap Studio targets **brainstorming, knowledge mapping, and presentation/sharing**. The
project / task-management layer (Gantt, schedules, dependencies, resources) is intentionally
out of scope, as are MindManager's collaboration / enterprise features (real-time co-editing,
cloud sync, the web/Teams apps); see `NEXT_STEPS.md` for the current edges.
