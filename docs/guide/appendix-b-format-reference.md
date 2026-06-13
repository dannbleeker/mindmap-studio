# Appendix B -- Format reference

What goes in, what comes out, and what survives the trip. For the day-to-day guidance on
*which* format to reach for, see Chapter 6; this appendix is the detail.

## Export formats

- **JSON** (native) -- **lossless**. The complete model: topics, notes, markers, images,
  boundaries, relationships, styling. The format to use whenever you might re-open the map.
- **Markdown** -- the tree as an outline (`#` root, nested bullets). Round-trippable as
  structure; canvas-only detail (colour, arrows) is naturally dropped.
- **OPML** -- standard outliner interchange. Structure and topics; not canvas styling.
- **PNG** -- a raster image of the canvas, for slides and chat.
- **SVG** -- a vector image: crisp at any zoom, ideal for high-resolution use.
- **HTML** -- a single self-contained page, openable in any browser.
- **HTML slide deck** -- the walk-through as a standalone, navigable presentation in one
  self-contained file (an overview slide, then one per branch).
- **Word (`.docx`)** -- the map as an editable outline document (title, indented bulleted
  topics, notes as italic lines); a minimal Open-XML package that opens in Word,
  LibreOffice, Pages, and Google Docs.
- **PDF** -- via the browser's print path; a fixed-layout document for sending or printing.

## Import formats

- **JSON** (native) -- the lossless round trip of the JSON export.
- **Markdown** -- any `#`/bullet outline becomes a map.
- **OPML** -- outlines from other tools.
- **MindManager `.mmap`** -- one-way, lossy (see below).
- **Batch import** -- select several files at once to create several maps in one step.

## What the `.mmap` importer recovers

The MindManager importer was built from MindManager's published XML schema, not guessed
at. From a `.mmap` file it recovers:

- the **topic tree** and all topic text;
- **notes** (the plain-text preview MindManager stores);
- **stock icons**, mapped to the closest **emoji** marker;
- **hyperlinks** on nodes;
- **relationships**, as cross-links between nodes;
- **boundaries** drawn over a subtree;
- **floating topics**.

## What it deliberately leaves behind

MindManager carries data MindMap Studio doesn't model -- chiefly **task and project
information**: schedules, durations, resource assignments, Gantt data. The importer
**warns** you about what it skipped rather than dropping it silently, and it does a
left-behind check for any topic it couldn't reach. Treat the import as a migration --
a clean start in a new tool -- not as a two-way sync.

## A practical note on lossless round trips

Only **JSON in and JSON out** is guaranteed to reproduce a map exactly. If a map matters,
keep a JSON export (or a whole-library backup, Chapter 7) as the canonical copy, and treat
the other formats as *views* of it -- excellent for sharing, not the thing you archive.
