# Sharing and exporting

### Getting the map out -- losslessly when it matters

A map you can't get out of the app is a map held hostage. MindMap Studio is built on the
opposite principle: your work is plain data, and there are many doors out. This chapter
is the catalogue of them, and when to use which.

## The export menu

The toolbar's **Export** menu offers, in rough order of fidelity:

- **JSON** -- the native format, and the only **lossless** one. Topics, notes, markers,
  images, boundaries, relationships, styling: everything in the model survives a round
  trip. Export to JSON for backup, for moving a map between machines, or any time you
  might want to re-open it later with nothing lost.
- **Markdown** -- the map as an indented outline (`#` root, nested bullets). Perfect for
  pasting into a document, a wiki, or a pull request. It's round-trippable as structure,
  though it naturally drops canvas-only detail like colours and arrows.
- **OPML** -- the interchange format outliners speak. Use it to hand your structure to
  another outlining tool.
- **PNG** and **SVG** -- the map as a picture. PNG for slides and chat; SVG when you want
  a crisp, scalable image that survives zooming.
- **HTML** -- a self-contained web page of the map, openable in any browser with nothing
  installed.
- **HTML slide deck** -- the walk-through (Chapter 7) as a standalone, navigable
  presentation in a single file: an overview slide, then one per branch, advanced with the
  arrow keys or a click. Hand someone the file and they can present your map with nothing
  installed.
- **PowerPoint (`.pptx`)** -- a real, editable slide deck: an overview slide, then one per
  branch with its points as bullets. For when the deck has to live in PowerPoint -- a house
  template to apply, or a room to run from the corporate machine.
- **Word (`.docx`)** -- the map as an editable outline document: a title, indented bulleted
  topics, and notes as italic lines. For when the next step lives in a word processor --
  minutes, a brief, a hand-off to someone who doesn't use the app.
- **PDF** (via print) -- a fixed-layout document for sending and printing.

A rule of thumb: **JSON to keep it, Markdown to discuss it, PNG/SVG/HTML to show it,
the slide deck or PowerPoint to present it, Word or PDF to send it.**

## Importing

The same breadth applies going in. MindMap Studio reads:

- **Native `.json`** -- the lossless round trip of the export above.
- **Markdown** outlines -- any `#`/bullet structure becomes a map.
- **OPML** -- from other outliners.
- **MindManager `.mmap`** -- see below.

You can **batch-import** several files at once, which turns a folder of outlines into a
library of maps in one step.

## The MindManager bridge

If you're arriving from MindManager, the **`.mmap` importer** is the on-ramp. It reads a
`.mmap` file and recovers the parts that map cleanly onto MindMap Studio's model: the
topic tree and text, notes, stock icons (rendered as emoji markers), hyperlinks,
relationships, boundaries, and floating topics. It was built against MindManager's own
published schema rather than guessed at, so the common cases come through faithfully.

It is deliberately **one-way and lossy**: MindManager carries project data --
task scheduling, resources, Gantt information -- that MindMap Studio doesn't model, and
the importer tells you when it has left something behind rather than pretending the map
came across whole. The bridge is for *migrating* a map, not for living in both tools at
once.

> **Why lossy is the honest choice.** A converter that silently drops what it can't
> represent leaves you to discover the gaps later, usually at the worst moment. The
> importer's warnings are a feature: they tell you exactly what to check.

## Where your data lives

Nothing in this chapter sends your map anywhere. Exports are files saved to *your*
machine; imports read files *you* choose. Day to day, every map lives in your browser's
local database, and the app works fully offline (Chapter 7). Sharing is always an
explicit act, never a background one -- which is exactly how a thinking tool should treat
the half-formed ideas you trust it with.

## Now you try

Take any map and export it twice: once to **JSON** and once to **Markdown**. Open the
Markdown in a text editor — there's your outline, ready to paste into a document. Now start
a **new** map and import the JSON you saved: it comes back exactly, down to the markers and
arrows. You've just proved the thing that matters most about a thinking tool — your work
isn't trapped in it. **JSON to keep it, Markdown to share it.** Make that round trip once
and you'll trust the app with the ideas you're still figuring out.

Then take the same map to an audience two more ways. Export the **slide deck** (or
**PowerPoint**, if the deck has to live there) and open it -- you're presenting: an overview,
then one slide per branch, arrow keys to move, nothing installed. Export **Word** and open it
in your word processor -- the same map as an editable
outline, ready to become minutes or a brief. One map, four jobs -- archived, discussed,
presented, and written up -- and not once did your work leave your machine.

The final chapter is about the most demanding kind of sharing: standing up and walking a
room through a map live.
