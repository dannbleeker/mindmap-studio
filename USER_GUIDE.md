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
| **+ New…** | Create a map from a [template](#templates) (Blank / Brainstorm / SWOT / Project plan) |
| **(map dropdown)** | Switch between maps in your [library](#the-map-library) |
| **Delete** | Delete the current map |
| **▶ Present** | Start [presentation mode](#presentation-mode) |
| **Fit** | Scale + center the map in the viewport |
| **⊟ / ⊞** | [Collapse / expand all](#collapse--expand) branches |
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

### Find & Replace

Type in **Find** to jump between matching topics **and notes** — press **Enter** repeatedly to
cycle hits (an `n/total` counter shows where you are). Type in the **Replace** box and click
**Replace all** to rewrite the search text across every matching topic. Press **`/`** anywhere
(when you're not typing) to jump straight to Find.

### Collapse / expand

**⊟** collapses every branch to a level-1 overview; **⊞** expands the whole tree. **Fit**
re-frames the map.

### Layout

The **Layout** dropdown arranges branches **Both sides**, **Right**, or **Left** of the root.
The choice is remembered.

### Themes

The **Theme** dropdown restyles the whole canvas — **Light**, **Dark**, **Ocean**, **Sunset** —
live, without losing edits. Image exports inherit the theme, so a dark map exports dark.

---

## Relationships & boundaries

- **Relationships** — draw a labelled arrow between two nodes (right-click → Link). Arrows you
  draw are saved, and ones imported from `.mmap` are shown.
- **Boundaries** — a labelled bracket around a node's subtree (right-click → Summary). Drawn
  and imported boundaries both round-trip and persist.
- **Floating topics** — detached topics imported from `.mmap` appear in a "Floating topics"
  branch (display-only).

---

## The map library

Every map you create or import is kept in the browser, keyed by name in the **map dropdown**.
Switch freely; each is autosaved. **Delete** removes the current one.

### Templates

**+ New…** offers starter maps: **Blank**, **Brainstorm** (the 5 Ws + How), **SWOT**, and
**Project plan**.

---

## Importing

**Open files** accepts (and you can multi-select to **batch-import** a whole folder):

| Format | Notes |
|---|---|
| `.mmap` | MindManager export — recovers topics, notes, icons, hyperlinks, relationships, boundaries, floating topics (one-way, lossy by design) |
| `.md` / `.markdown` | Markdown outline (H1 root + nested bullets) |
| `.json` | A native MindMap Studio map — **lossless** |
| `.opml` | OPML outline (Freeplane, OmniOutliner, Workflowy, …) |

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
| `.png` / `.svg` | Image of the map (inherits the current theme) |
| `.html` (standalone) | A single self-contained HTML file — the whole map as an image (opens anywhere, offline) |
| `.html` (slide deck) | A standalone, navigable slide presentation — the [Walk-Through](#presentation-mode) as a shareable file (arrow keys / click / Prev-Next, offline) |
| `.pdf` | Opens your browser's print dialog → "Save as PDF" (landscape) |

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

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| Enter | Add sibling |
| Tab | Add child |
| Ctrl + Enter | Add parent |
| Delete | Remove node |
| Ctrl + Z / Ctrl + Shift + Z / Ctrl + Y | Undo / redo |
| `/` | Focus Find |
| Enter (in Find) | Next match |
| Arrow keys / Esc (in Present) | Navigate / exit slides |

---

## Notes on scope

MindMap Studio targets **brainstorming, knowledge mapping, and presentation/sharing**. The
project / task-management layer (Gantt, schedules, dependencies, resources) is intentionally
out of scope. Some MindManager visual features (organic/tapered branches, alternate layouts
like org-chart/timeline/fishbone, callouts) depend on the rendering engine and aren't
available; see `NEXT_STEPS.md` for the current edges.
