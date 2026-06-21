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
3. On first launch you'll land on the **[Start screen](#the-start-screen)**: capture a new map
   (type a topic, paste an outline, or open a blank canvas), or pick a template. Once a map is
   open you're in the editor — click around, then start your own.

Everything autosaves to your browser as you work, and the last map you had open — along with the
side panels you had open (Notes, Outline, Markers, Style) — is restored next time, dropping you
straight back into the editor. Press **⌂ Start** in the toolbar to return to the Start screen any
time. It also works fully offline and can be installed (see [Install as an app](#install-as-an-app)).

---

## The Start screen

When no map is open — on a fresh install, or any time you press **⌂ Start** in the toolbar —
MindMap Studio shows a dedicated home. A left rail switches sections; the main area changes in
place and your editor is never touched:

- **Start** — a capture hero to make a new map three ways: **type a topic**, **paste an outline**
  (indentation or `#` levels set the hierarchy), or open a **blank canvas**. Below it sit your most
  **recent** maps and a few **templates** for a quick start.
- **All maps** — your whole library as cards or a list, sortable by last-edited, name, or size.
  Each card's **⋯** menu opens, renames, duplicates, exports, or deletes the map.
- **Recent** — every map grouped by when you last edited it (Today / Yesterday / Earlier).
- **Templates** — every [starter map](#templates), each with a thumbnail and a **computed** node
  count and branch preview. Picking one opens it pre-filled.
- **Layouts** — open a blank map directly in any [layout](#layout) (two-sided, org-chart, radial,
  timeline, fishbone, grid, brace…) or diagram backdrop (onion, funnel, Venn).
- **Import** — drop in or pick files in any [supported format](#importing).
- **Learn** — a short primer on mind-mapping principles, with a link to the companion book.
- **About** — what the app is and how your data stays local, plus links to the **book**
  (*Thinking in Maps*, PDF + EPUB), the [user guide](#), the dashboard, and the source.

Press **⌘K** (Ctrl-K) anywhere on the Start screen for a **command palette**: type to fuzzy-search
your maps and the main actions, then Enter to go.

---

## The toolbar

Left to right:

| Control | What it does |
|---|---|
| **☰ Outline** | Toggle the [outline panel](#outline-panel) |
| **📑 Index** | Toggle the [marker & tag index](#marker--tag-index) |
| **🎚 Filter** | Toggle the [Power Filter](#power-filter) (dim non-matching topics) |
| **🕔 History** | Toggle [version history](#version-history) — restore an earlier snapshot |
| **+ New…** | Create a map from a [template](#templates) (Blank, Brainstorm, SWOT, Project, 5 Whys, Decision, Retrospective, Meeting, Pre-mortem) |
| **(map dropdown)** | Switch between maps in your [library](#the-map-library) |
| **Delete** | Delete the current map |
| **▶ Present** | Start [presentation mode](#presentation-mode) |
| **Fit** | Scale + center the map in the viewport |
| **⊟ / ⊞** | [Collapse / expand all](#collapse--expand) branches |
| **1. Numbering** | Toggle [outline numbering](#auto-numbering) (1, 1.2, …) on every topic |
| **⌒ Line jumps** | Toggle [line-jumps](#relationships-boundaries--callouts) — a hop where two relationship arrows cross |
| **◎ Focus** | [Focus the selected branch](#focus-a-branch) — dim everything else (Esc exits) |
| **Canvas** | [Per-map background colour + image](#canvas-background) (overrides the theme) |
| **ℹ Info** | Toggle the [topic info panel](#topic-info-panel) — note, markers, tags, style, links for the selected node |
| **Find / Replace** | [Search and replace](#find--replace) topics & notes (`/` jumps here) |
| **Theme** | [Canvas theme](#themes): Light / Dark / Ocean / Sunset |
| **Layout** | [Layout direction](#layout): Both sides / Right / Left |
| **⬆ Export…** | Save the map in any format — see [Exporting](#exporting) |
| **⬇ Backup** | [Back up](#backup--restore) the whole library to one file |
| **Open files** | [Import](#importing) one or many files |

Related controls are grouped into labelled **menus** (Panels, Insert, Canvas, Export, More). Every
menu is fully **keyboard-navigable** — open with the mouse or **↓**, move with **↑ ↓ Home End**, run
with **Enter**, and close with **Esc** (focus returns where it was). On phones the menus open as a
full-width **bottom sheet**. And anywhere in the editor, press **⌘K** (Ctrl-K) for a **command
palette** — fuzzy-search and run any toolbar action (present, export, toggle a panel, switch layout,
group a branch, …) without reaching for the menus.

---

## Editing the map

Keyboard-first, just like MindManager:

- **Enter** — add a sibling topic
- **Tab** — add a child topic
- **Ctrl + Enter** — add a child of the selected topic
- **Delete** — remove the selected topic and its branch immediately; an **Undo** toast appears (and Ctrl/⌘+Z works) — no confirmation prompt
- **Just start typing** on a selected topic — it opens for editing with your first keystroke replacing the old text (type straight on)
- **Double-click** a node, or press **F2** with it selected — edit its text inline (starting from the existing text, all selected)
- **Ctrl + B / I / U** — while editing a topic: bold / italic / underline the selection
- **⌘K / Ctrl-K** — open the [command palette](#the-toolbar) to search and run any action
- **Drag** a node onto another — re-parent it
- **Ctrl + Z / Ctrl + Shift + Z** (or Ctrl + Y) — **undo / redo** (kept in sync with what's saved)
- Right-click a node for the full context menu (add/remove, summary, link, focus mode, move up/down)

Edits you make on the canvas — adding, renaming, moving, restyling — are captured into the map's
underlying model, so the outline, every export, and the autosave always reflect your latest changes.

### Topic info panel

Select a node and open **ℹ Info** to see and edit everything about it in one side panel — its
note, markers, tags, style, and links. (This replaces the old separate **Notes**, **Markers**, and
**Style** toggles.) The panel is organised into three tabs: **Details** (tags, progress, dates,
priority, attachments, links), **Style** (shape / fill / border / font, markers, stickers), and
**Notes** (the Markdown editor) — move between the tabs with the **←/→** (and **Home/End**) keys once
one is focused. **Minimize** it with the **›** button to collapse it to a thin strip
on the right edge (click the strip's ℹ to bring it back) — minimizing sticks, so selecting other
nodes won't reopen it; re-expanding shows whatever node is selected then. **Drag the panel's left
edge to resize it** (the width is remembered); the header shows the topic's path (Root › Branch …)
and a facts line — outline number, depth, child count, and note size — plus, once a topic has been
created or edited, a **created / last-edited** line. (Those times are saved in the map's `.json` but
never drawn on the canvas or in image / PDF exports.)

**Edit several topics at once.** Select multiple topics — **Shift/Ctrl/⌘-click** to add to the
selection, or **drag a box** across the empty canvas — and the inspector switches to bulk mode (an
"N topics selected" banner). Changes to **shape, fill, border, font/bold, progress, dates and
priority** apply to every selected topic at once (a single undo reverts them all). **Markers and
tags** also work in bulk, with a *tri-state* view: a chip is **lit** when every selected topic has
it and **dashed (a “+” chip)** when only some do — clicking adds it to the whole selection, or
removes it from all if they all already have it. The remaining per-item editors (notes, stickers,
attachments, links) stay single-topic — select one topic to edit those. If the selected topics
disagree on a field (progress, dates or priority), its control
shows blank and is tagged **Mixed** — so a bulk edit never silently overwrites them all with one
topic's value; set the control to apply a single value to the whole selection. A plain click clears
the multi-selection. *(Because the canvas now box-selects on a
left-drag, pan with the middle or right mouse button; scroll still zooms.)*

**Map properties.** With nothing selected, the panel shows the **Map** — rename the map inline and
set its **theme**, **layout**, **background colour / image**, and **line-jumps** there (the same
settings as the toolbar's Canvas menu), above a quick **overview** (topics, branches, task progress).
When the map has a **diagram backdrop** (onion / funnel / Venn), a **Backdrop** section lets you
add / remove a ring or stage, set its **colour**, and remove the backdrop. Clicking a **relationship**
arrow instead shows a connector editor (see [Relationships](#relationships-boundaries--callouts)).

- **Note** — write in the **WYSIWYG** editor: a formatting toolbar (**bold**, *italic*,
  ~~strikethrough~~, bulleted list, numbered list) and inline formatting as you type — no raw markup
  to read. The note box fills the inspector's height. Notes autosave, travel with the map (and the
  lossless `.json` export). Behind the scenes the note is stored as **Markdown** (`#` headings,
  `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `- lists`, `1. numbered`, `[links](https://…)`),
  so it stays portable across every export. Nodes with a note show a 📝 — in the
  [outline](#outline-panel) and on the topic itself; **click the topic's 📝 to jump straight to its
  note** (it selects the topic and opens this panel on the Notes tab).
- **Markers** — click a marker (✅ ❗ ⭐ 🚩 priority numbers, …) to toggle it; active markers are
  highlighted. Imported MindManager icons map to these glyphs automatically.
- **Stickers** — click a sticker in the grid (star, heart, check / cross badge, flag, idea, warning,
  info, speech bubble, thumbs up / down, target, rocket, lock, key, clock, pin, fire, question, arrow)
  to drop a built-in illustration on the node — no file needed. A sticker becomes the node's
  [image](#images), so it shows on the canvas and carries into every export. To swap or remove it,
  pick another image/sticker (a sticker replaces the node's current picture).
- **Tags** — type a tag and press **Enter** to add it; click a chip's ✕ to remove it. Tags feed
  Find, the [marker & tag index](#marker--tag-index), and the [Power Filter](#power-filter).
- **Progress** — set a task's completion with the **0 / 25 / 50 / 75 / 100** buttons (✕ clears it,
  so it stops being a task — the pie disappears). A small **completion pie** (MindManager-style: empty
  at 0%, a wedge in between, a full disc with a **✓** at 100%) appears on the node. **Click the pie on
  the node to step its completion** (0 → 25 → 50 → 75 → 100 → 0) without opening this panel. **Parents
  roll up automatically**: a branch with sub-tasks shows their average plus a *done / total* count
  (e.g. *75% · 1/2*) and is read-only (marked *auto*, so its pie isn't clickable). The percentage also
  shows in the Outline, and the pie is carried into image exports (PNG/SVG).
- **Dates** — set a **Start** and **Due** date; a **📅 chip** appears on the node and turns **red when
  overdue** (past due and not yet 100%). Clearing a date removes the chip. Dates are carried into
  image exports and saved with the map; the [Power Filter](#power-filter) can filter by due date.
- **Priority** — set **High / Med / Low**; a small coloured chip shows on the node (✕ clears it).
  Unlike the emoji priority markers, this is a structured value the [Power Filter](#power-filter) can
  filter by.
- **Attachments** — attach any file (**+ Attach file**); a **📎** count shows on the node and the
  panel lists each file with its size, a click-to-**download** link, and a ✕ to remove it. Files are
  stored inline in the map (capped at 5 MB each), so they stay offline and travel with a `.json`
  export — nothing is uploaded.
- **Style** — **Shape** (Box / Rounded / Pill, plus the vector shapes **diamond** = decision,
  **oval** = start/end, **parallelogram** = input/output, **hexagon** = preparation, **cylinder** =
  data store, **trapezoid** = manual operation, **octagon** = stop/limit, **document** = report/output,
  **callout** = speech/annotation, **star** = highlight, **cloud** = idea/external system), **Fill**,
  **Border** (swatch or ✕ for none), **B** for bold, **Reset** to clear; a **Font** picker
  (Sans / Serif / Mono) plus font size/colour live here too. Shapes and the chosen font render
  identically on the canvas and in image exports.
- **Links** — give the node a clickable **🔗**: a **web** URL, **Link to a map** (another map in
  your library), or **Jump to a topic** (an in-map jump). Click the 🔗 on the node to follow it;
  **✕ Remove link** clears it. A node holds one link at a time.
- **Linked from** — the reverse view: every topic that points *at* this one, via a topic-jump link
  (`↪`) or an incoming relationship arrow (`↬`, with its label). Each row is a one-click jump that
  selects and centres that source topic. The section appears only when something links in.

### Images

Click **Image**, pick a picture, and it's attached to the selected node. Images are
downscaled and stored inside the map (as a data URL), so they stay offline and travel with a
`.json` export.

Don't have a file handy? The **ℹ Info** panel's **Stickers** grid offers 20 built-in inline-SVG
illustrations (see [Markers / Stickers](#topic-info-panel) above). A sticker *is* the node's image —
same render, same exports — so it's the quickest way to add a touch of visual meaning without
supplying your own picture. A node holds one image at a time, so a new image or sticker replaces it.

### Rich-text topics

Per-topic styling restyles the *whole* node; rich text formats *part* of the topic. While
editing a topic, press **Ctrl + B**, **Ctrl + I**, or **Ctrl + U** to bold, italic, or
underline — select the characters first, or toggle the format on and keep typing. The
formatting is saved with the map and travels in the `.json` export. The plain text is always
kept alongside it, so the outline, Find, and the Markdown/Office exports stay clean and readable.

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
search (matches topic **and** note) with toggle chips for any marker or tag in the map, plus a
**Due date** option (*Has a date · Overdue · Due ≤ 7 days*) and a **Priority** option (High / Med /
Low); criteria are combined with AND (a topic must satisfy each category you've set). A live count
shows how many topics matched. It changes nothing in the map — **Clear** or closing the panel restores
everything — so it's a safe way to focus a crowded map on, say, every urgent (❗) item mentioning
"budget". (This differs from **Find**, which steps you through matches one at a time, and the
**Filter outline…** box, which narrows the outline list.)

Once a filter is set, name it and click **Save** to keep it as a reusable preset. **Saved filters**
appear in the panel: click a name to re-apply it (on any map), or **✕** to remove it. Presets are
stored locally and travel with you between maps — handy for views you return to, like "every blocked
🚩 item" or "this quarter's tags".

### Focus a branch

Select a node and click **◎ Focus** to spotlight just that branch: the node, its whole subtree,
and the path back to the central topic stay bright while everything else dims. It's the fastest way
to talk through one part of a busy map without deleting or collapsing anything. Press **Esc** or
click **Show all** in the banner to bring the rest back. (Like the Power Filter, it only changes
opacity — nothing is removed.)

### Find & Replace

Type in **Find** to jump between matching topics **and notes** — press **Enter** repeatedly to
cycle hits (an `n/total` counter shows where you are). Type in the **Replace** box and click
**Replace all** to rewrite the search text across every matching topic. Press **`/`** anywhere
(when you're not typing) to jump straight to Find.

Find is **typo-tolerant**: if nothing matches exactly, it automatically retries with a fuzzy pass,
so a slip like `Launhc` still finds **Launch**. Exact matches always take priority, and very short
queries stay strict — so precise searches behave exactly as before.

### Search all maps

**🔎 All maps** (in the header) searches your whole library at once — every map's topics and
notes, including floating topics. Pick a result and it opens that map and focuses the node
(if the match is in the current map, it jumps straight there). Handy once the library grows
into a connected knowledge base.

### Board view (Kanban)

**▦ Board** shows the map's topics as cards grouped into **columns by tag** — one column per tag,
with everything else gathered in an **Untagged** column. Each card shows its rolled-up
[progress](#topic-info-panel) and [due date](#topic-info-panel) (red when overdue). It's a
**read-only** view of the same map — cards don't move and nothing is written back — so it's a quick
status wall, not a task tracker. **Click a card** to jump to that topic on the canvas. Tag your
topics (in the **ℹ Info** panel) to give the board its columns.

### Conditional formatting

**🎨 Styles** opens a panel where you set **rules** that auto-style topics: *When* a topic **has a
tag**, **has a marker**, or **is completed** (task at 100%), apply a **fill** and/or **border**. So
"colour completed topics green" or "give every **#risk** topic a red border" happens automatically as
the map changes. Rules are a **view-only overlay** — they layer *under* a topic's own styling, so
anything you set by hand on a node still wins, and nothing is baked into the topic. They're saved
with the map and carried into image exports. Add a rule with **+ Add rule**; remove one with **✕**.

The same panel has a **Named styles** organizer: style a topic by hand (shape / fill / border / bold
in the **ℹ Info** panel), then in **🎨 Styles** type a name and **Save** to capture that look. It
appears in the list — click it to **apply** that style to the selected topic, or **✕** to remove it.
Named styles are kept locally and reusable across maps, so a house style is one click away.

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
- **Grid / matrix** — tiles the first-level branches into a grid (four branches → a 2×2), each with
  its subtree beneath it and the root as a title above; the shape of a SWOT or Eisenhower matrix.
- **Brace map** — a left-to-right tree where each parent joins its children with a `{` fork brace
  (the Thinking-Maps part-whole diagram) instead of the curved branches.
- **Per-branch layout** — right-click any branch → **Branch layout** and pick a kind to lay out just
  that subtree differently from the rest of the map (e.g. an org-chart branch inside a radial map);
  pick **Default (map)** to clear it. The subtree is kept clear of its siblings, and the choice
  travels with the map.
- **Balancing the two sides** — in **Both sides**, the main branches are split left/right automatically
  to keep the map evenly weighted. To override it, right-click a main branch → **Map side → Left / Right**
  to pin it to a half (the rest re-balance around it), or **Auto** to release the pin. **View ▾ → Balance
  map** (also in ⌘K) clears every pin and redistributes the branches evenly again.
- **🧲 Free layout (whiteboard)** — a toggle (next to the layout picker), not a layout. Turn it on and
  you can **drag any topic anywhere** — it stays put and the auto-layout pauses. Combined with node
  shapes and directional arrows, this is how you build a **place-anywhere flowchart, concept map, or
  whiteboard**. Turning it on keeps everything where it is; turning it off returns to the auto-layout
  (your positions are remembered, so you can switch back). Try the **Whiteboard (free layout)**
  example in **+ New…**.
- **◎ Diagram (backdrops)** — adds a geometric **frame** behind your topics and switches to free
  layout so you drop topics into its regions: an **onion** (concentric rings), a **funnel** (stacked
  stages), or a **Venn** (2 or 3 overlapping circles). Use **−/+** to change the ring/stage count
  (onion + funnel) and **✕ Backdrop** to remove it. The region labels are ordinary topics you place
  in each region; the frame renders into image exports. Try the **Onion**, **Funnel**, and **Venn**
  examples in **+ New…**.

### Themes

The **Theme** dropdown restyles the whole canvas — **Light**, **Dark**, **Ocean**, **Sunset** —
live, without losing edits. Image exports inherit the theme, so a dark map exports dark.

### Canvas background

The **Canvas** colour control sets the background for **this map only**, overriding the theme's
canvas colour — handy for colour-coding maps (a green "ideas" map, a red "risks" map) or matching a
brand. It's saved with the map and carries into the image/PDF export; the **✕** resets it to the
theme default.

Next to it, the **🖼** button sets a **background image** for the map: pick any image file and it
fills the canvas behind your topics (sitting on top of the background colour, so a transparent PNG
lets the colour show through). The picture is downscaled and stored inside the map, so the map stays
offline and portable, and it carries into every export — SVG, PNG, PDF, and HTML all show the same
backdrop you see on the canvas. The second **✕** removes the image.

---

## Relationships, boundaries & callouts

- **Relationships** — draw a labelled, **directional** arrow between two nodes: right-click the first
  node → **Link to…**, then click the target (you'll be prompted for an optional label). **Click a
  relationship to select it** and the inspector becomes a connector editor — change its **label**,
  **direction / arrowheads** (target, source, both, or none), **colour**, **width**, and **line
  style** (dashed / solid / dotted), or **delete** it (right-click still deletes as a shortcut). The
  selected relationship gets a highlight halo. Styling is lossless in `.json` and carries into every
  image / PDF / HTML export; drawn and imported (`.mmap`) relationships both persist.
  - **Line jumps** — on a busy map where relationship arrows cross each other, click **⌒ Line jumps**
    in the toolbar. Wherever two relationships cross, one of them draws a small semicircular **hop**
    over the other, so the lines clearly *pass over* rather than appear to join (you get one bump per
    crossing, never two). It's a per-map setting, saved with the map, and the hops are drawn into
    every image export exactly as they appear on the canvas.
- **Boundaries** — a shaded, rounded box grouping a node and its subtree. Select a node and
  click **⬚ Group** in the toolbar. **Click the box (its rim or label) to select it** — the inspector
  becomes a boundary editor where you can **name** or **delete** it. Drawn and imported boundaries
  both round-trip and persist.
- **Summary topics** — a labelled **bracket** beside a branch (rather than a box around it). Select a
  node and click **⊐ Summary** (or right-click → **Summarize branch**); the bracket auto-sizes to the
  branch and sits on the matching side. **Double-click its label** to rename it (clear the label to
  remove the summary). Summaries persist and are drawn into image exports.
- **Callouts** — a small sticky-note annotation pinned beside a node. Right-click a node →
  **Add callout**, then double-click the bubble to edit its text (the **×** removes it). Callouts
  are saved with the map and are drawn into the image exports too.
- **Editing overlays in the inspector** — clicking a **boundary**, **summary** bracket, or **callout**
  selects it (with a highlight) and turns the right panel into an editor for its label / text, a
  **Colour** swatch row (with **Default** to reset), and a **Delete** button — an alternative to the
  inline double-click gestures, which still work. A picked colour re-tints the whole object (outline,
  fill, and label) on the canvas and in every export; the backdrop colour lives in the Map panel.
- **Floating topics** — detached topics imported from `.mmap` appear in a "Floating topics"
  branch; edit them like any node (rename, add, remove, or drag in/out of the tree) and the
  changes are saved.
- **Sticky notes** — click **🗒 Note** in the toolbar to drop a free-floating **amber note** on the
  canvas. It's a floating topic underneath, so you rename it, drag it (in **🧲 Free layout**), and it
  exports and round-trips like any topic — handy for captions, reminders, and legends.

---

## The map library

Every map you create or import is kept in the browser, keyed by name in the **map dropdown**.
Switch freely; each is autosaved. **Delete** removes the current one.

Maps you open appear as **tabs** in a strip under the toolbar — one tab per document, the active one
underlined. Open a map (from the dropdown, a cross-map link, or **+**) and it gets a tab; click **×**
(or middle-click) to close it. The open tabs + the active one are remembered, so a reload reopens your
whole workspace.

### Copying a branch between maps

Right-click a branch → **Copy branch** to copy it (the whole subtree) to a clipboard kept in your
browser. Then — in the *same map or any other* — right-click where you want it → **Paste branch
here**: it grafts a fresh copy under that node (or drops it in as a floating topic if you paste onto
nothing). Because the clipboard persists across maps, this is how you **move a branch from one map
into another**, or assemble a roll-up by pasting branches from several maps into one. Each paste is
re-numbered internally, so you can paste the same branch as many times as you like without clashes.

### Rolling up other maps

A roll-up keeps a node mirroring another map. Select a node, pick a source map from the **⤵ Roll-up**
menu in the toolbar, then click **🔄 Roll-ups** — the node's children become a fresh copy of that
map's branches. Click **🔄 Roll-ups** again any time to pull the latest. One map can aggregate
several others — give each child node a different source — which is the *live* cousin of copy/paste
above (a paste is a one-off snapshot; a roll-up re-pulls on demand). A roll-up node is a mirror: its
children are replaced on each refresh, so edit the **source** map, not the pulled copy. Pick
**— Unbind** in the menu to detach it.

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

## Working with files

Your maps always autosave into the browser (the [library](#the-map-library)), but you can also keep a
map as a **file on disk** — to store it in a folder, sync it through Dropbox/OneDrive, email it, or
put it in version control. MindMap Studio's native file is **`.mmst`** (the same lossless format as a
`.json` export, just a distinct extension so your computer can associate it with the app).

In **More ▸ File** (or the **⌘K** command palette):

- **Open file…** (`Ctrl/⌘ + O`) — pick a `.mmst` (or `.json`) and open it.
- **Save to file** (`Ctrl/⌘ + S`) — save the current map back to its linked file, with no dialog. The
  first time (no file linked yet) this acts like *Save as…*.
- **Save as…** (`Ctrl/⌘ + Shift + S`) — choose a new file/location.

Once a map is linked to a file, your edits **autosave through to that file** as you work — so the disk
copy stays current without you pressing Save. The window/tab title shows the file name, with a **●** in
front whenever the file is briefly behind your latest edit; if you try to close the tab with unsaved
file changes, the browser warns you first. The link is remembered, so reopening the app reconnects the
map to its file.

> **Browser support.** Open/Save-to-the-same-file and file autosave use the **File System Access API**,
> available in **Chrome, Edge, and other Chromium browsers on desktop**. In Firefox, Safari, and on
> mobile, **Save** downloads a `.mmst` file and **Open** uses the normal file picker instead — and your
> work still autosaves to the browser, so nothing is lost.

### Make it your default app for `.mmst` (Windows)

If you **install** MindMap Studio as an app (the install button in Chrome/Edge, or *Apps ▸ Install*),
Windows can associate `.mmst` files with it: right-click a `.mmst` ▸ **Open with ▸ Choose another app**
▸ pick MindMap Studio ▸ *Always*. After that, **double-clicking a `.mmst` in File Explorer opens it
directly in the app** (in the already-running window if one is open). This is a Chromium-desktop
feature; it isn't available in Firefox/Safari or on mobile.

---

## Importing

### Paste text → map

**📋 Paste text** is the quickest way in: paste an outline, a bullet list, or Markdown and it
becomes topics. **Indentation** (spaces or tabs) or **`#` heading levels** set the hierarchy, and
`-` / `*` / `+` / `•` and numbered (`1.`) markers are all recognised — so an outline copied from a
doc, an email, or anywhere else just works. Choose **New map** to drop it in as its own map, or
**Add under selected** to graft it onto the current map under the selected node. It's all local —
a fast, private way to bring in an outline you wrote (or generated) elsewhere, with no upload.

### Fast capture

For getting ideas down quickly, three header tools:

- **Quick add** — type a topic in the **Quick add… ⏎** box and press **Enter**; it's added under the
  selected node (or the central topic if nothing's selected) and the box keeps focus, so you can
  fire off several in a row without touching the canvas.
- **Drop a link** — drag a link (or selected text) from your browser onto the canvas to create a
  **floating topic**; a dropped URL becomes a clickable link on it (unsafe links are refused).
- **⏱ Brainstorm timer** — pick **3 / 5 / 10 / 15 min** to timebox an idea sprint; it counts down
  in the toolbar and flags **time's up**. Purely a focus aid — it changes nothing in the map.

### Open files

**Open files** accepts (and you can multi-select to **batch-import** a whole folder):

| Format | Notes |
|---|---|
| `.mmap` | MindManager export — recovers topics, notes, icons, hyperlinks, relationships, boundaries, floating topics (lossy by design; the `.mmap` export below is the return trip) |
| `.md` / `.markdown` | Markdown outline — `#`/`##`/`###` headings **and** nested bullets (also imports **Markmap** files, stripping any `---` frontmatter; its `title:` becomes the map title) |
| `.json` | A native MindMap Studio map — **lossless** |
| `.opml` | OPML outline (Freeplane, OmniOutliner, Workflowy, …) |
| `.mm` | FreeMind / Freeplane map — topics, links, folded state, and notes |
| `.mmd` / `.mermaid` | Mermaid `mindmap` text (any node shape; hierarchy by indentation) |
| `.xmind` | XMind — topics, notes, web links, labels→tags (modern `content.json` **and** legacy `content.xml`) |
| `.smmx` | SimpleMind — topic tree, notes, web links, and relations→cross-links |
| `.itmz` | iThoughts — topic tree, notes, web links, relationships→cross-links, floating topics |
| `.mind` | MindMeister — topic tree, notes, and web links from `map.json` |
| `.mup` | MindMup — JSON map (rank-ordered children, notes, links) |
| `.textpack` | TextBundle / TextPack (Bear, Ulysses, iA Writer) — the bundle's `text.md` → topic tree |
| `.docx` | Word — the document's outline (heading styles or indentation) → topic tree, with italic note paragraphs |
| `.xlsx` | Excel — an indented-outline sheet (first non-empty column = depth, trailing column = note); reads inline + shared strings. Empty-topic rows aren't imported |

Each imported file becomes its own library entry; batch imports report how many were added.
MindManager stock icons are mapped to the closest **emoji** marker, so an imported map keeps its
visual cues rather than arriving as bare text.

### Version history

**🕔 History** opens a per-map list of past snapshots, newest first, each labelled with when it
was taken and its topic count. **Restore** rolls the map back to that snapshot — and because your
current state is checkpointed first, a restore is itself undoable (just restore the top entry).
Snapshots are captured **automatically as you edit** (coalesced to about one every few minutes) and
on demand with **Save version now**. History is capped at the 30 most recent per map (older ones are
pruned), lives entirely in your browser (IndexedDB), and is deleted along with the map. It's the
fine-grained companion to **Backup** (which snapshots the *whole library* to a file).

**▶ Play timeline** turns that list into a playback: it shows each snapshot on the canvas in order,
oldest to newest, so you can *watch* the map evolve. A control bar gives you play/pause, step
(⏮ / ⏭), and a scrubber to jump to any point; playback is **read-only**, so nothing changes until
you click **Restore this** at the frame you want — or **Exit** (or press **Esc**) to return to the
live map. Needs at least two saved versions.

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
| `.mmap` | MindManager — topic tree, notes, hyperlinks, icons, relationships, and the two-sided side; the mirror of the `.mmap` importer (round-trips back into Studio for these fields) |
| `.png` / `.svg` | Image of the map (inherits the current theme) |
| `.html` (standalone) | A single self-contained HTML file — the whole map as an image (opens anywhere, offline) |
| `.html` (interactive) | A single self-contained HTML file — the map as a **collapsible, searchable** outline: fold branches, filter topics, zoom/pan (no app, no backend, offline) |
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

### Presenter view

Click **Presenter view** in the control bar (or press **P**) to turn on a presenter sidebar
beside the live slide — what *you* see while the audience still sees only the slide. It shows:

- **Speaker notes** — the current branch's [note](#notes), rendered as Markdown (or a quiet
  "No notes for this slide." when there isn't one). Write your talking points in the note and
  they're waiting for you here.
- **Next up** — the heading of the slide you're about to advance to (or "End of map" on the last
  one), so you can land the transition.
- **Agenda** — the map of your whole talk: every slide (the overview plus each branch) in order,
  with a **3 / 8**-style position indicator and the current slide highlighted. Click any item to
  jump straight to that slide.

It's a single-screen layout (no second window to manage), and the toggle only changes *your* view
— the audience slide is untouched. Press **P** again to hide it.

To share the same walk-through without the app, export it as a **slide deck** — the
`.html (slide deck)` option in the **⬆ Export…** menu saves a standalone, navigable HTML file
that opens in any browser, offline.

---

## Install as an app

MindMap Studio is an installable PWA: your browser will offer to install it to your desktop /
home screen, after which it launches in its own window and runs fully offline (the app shell
is precached). On a **phone** the layout adapts — the editor toolbar becomes a single swipeable
strip so the canvas fills the screen, the side panels (Outline, Info, …) open as **bottom sheets**
over a full-width canvas rather than squeezing it, and the start screen's rail folds into a top nav.

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
| Ctrl + Enter | Add child (selected topic) |
| Shift + Tab | Outdent (promote one level) |
| Delete | Remove the topic + its branch (instant — undo from the toast) |
| Type a letter (topic selected) | Edit in place, replacing the text |
| F2 / double-click | Edit in place, keeping the text |
| Ctrl + B / I / U (while editing) | Bold / italic / underline the selection |
| Ctrl + Z / Ctrl + Shift + Z / Ctrl + Y | Undo / redo |
| Ctrl + K | Open the command palette — run anything, or jump to a topic |
| `/` | Focus Find |
| Enter (in Find) | Next match |
| Arrow keys / Esc (in Present) | Navigate / exit slides |

(All of these — Ctrl works as ⌘ on a Mac.) The same list is built into the app: press the **?**
button at the bottom of the left rail, or ⌘K → **"Keyboard shortcuts"**, for a cheat-sheet grouped by
Editing / Navigation / View.

### On the canvas

- **Add a topic with the mouse.** Hover (or select) any topic to reveal a small **＋** — one adds a
  **child**, one adds a **sibling**, dropping straight into editing. New to the app? A one-time
  **"3 things to try"** card and an empty-map hint point the way; both disappear once you make an edit.
- **Move around.** **Drag the background to pan**, **scroll** (or ⌘-scroll) to **zoom**, and
  **double-click an empty spot** to drop a floating topic. Hold **Shift** and drag to rubber-band a
  multi-selection.
- **Re-parent by dragging.** Drag a topic onto another; the target highlights with a
  **"↳ Make child of X"** label so you can see the result before you let go. Drop on empty space to
  cancel.
- **Delete safely.** Deleting a topic or a whole map is **instant and reversible** — an **Undo** toast
  appears (and Ctrl/⌘+Z works too); there's no blocking confirmation.

---

## Notes on scope

MindMap Studio targets **brainstorming, knowledge mapping, and presentation/sharing**. The
project / task-management layer (Gantt, schedules, dependencies, resources) is intentionally
out of scope, as are MindManager's collaboration / enterprise features (real-time co-editing,
cloud sync, the web/Teams apps); see `NEXT_STEPS.md` for the current edges.
