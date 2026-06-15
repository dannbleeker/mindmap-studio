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
- **FreeMind / Freeplane (`.mm`)** -- the most widely-read mind-map format. Carries the
  topic tree, links, folded branches, and notes, so a map opens in FreeMind, Freeplane,
  XMind, and the many tools that import `.mm`. The bridge to almost any other mind-mapper.
- **Mermaid (`.mmd`)** -- the `mindmap` text format you embed in Markdown, a README, or a
  wiki that renders Mermaid (GitHub, GitLab, Notion, many docs tools). For when the map
  should live *as text* inside something you're already writing.
- **XMind (`.xmind`)** -- the native format of one of the most popular mind-mappers, written
  the modern (2020+) way. Carries the topic tree, notes, links, and tags, plus floating topics
  and relationships, so the map opens natively in XMind rather than going through `.mm`.
- **SimpleMind (`.smmx`)** -- the native format of the cross-platform SimpleMind app. Carries
  the topic tree, notes, web links, and relations, plus floating topics, so the map opens
  natively in SimpleMind on desktop or mobile.
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
- **Excel (`.xlsx`)** -- the map as an indented outline worksheet: each topic in the column
  matching its depth, with a Notes column. For when you want to sort, filter, or count the
  outline as a spreadsheet.
- **PDF** (via print) -- a fixed-layout document for sending and printing.

A rule of thumb: **JSON to keep it, Markdown to discuss it, PNG/SVG/HTML to show it,
the slide deck or PowerPoint to present it, Word or PDF to send it, Excel to crunch it.**

## Copy the outline

Sometimes you don't want a file at all -- you want the text on your clipboard, ready to
paste. The **⧉ Copy outline** button copies the whole map as a Markdown outline in one
click: drop it straight into an email, a chat message, a ticket, or a document. It's the
same structure as the Markdown export without the round trip through a saved file -- the
fastest way to turn a map into words somewhere else. Reach for it when the map was the
*thinking* and some other place is where the writing has to land.

## Importing

The same breadth applies going in. MindMap Studio reads:

- **Native `.json`** -- the lossless round trip of the export above.
- **Markdown** outlines -- any `#`/bullet structure becomes a map, **Markmap**-flavoured
  Markdown (YAML frontmatter plus multi-level headings) included.
- **OPML** -- from other outliners.
- **FreeMind / Freeplane `.mm`** -- topics, links, folded state, and notes.
- **Mermaid** `mindmap` text -- any node shape; the hierarchy comes from the indentation.
- **XMind `.xmind`** (2020+) -- topics, notes, web links, and labels become tags.
- **SimpleMind `.smmx`** -- topic tree, notes, web links, and relations.
- **MindMup `.mup`** -- the JSON maps from the browser-based MindMup.
- **TextBundle / TextPack** (`.textpack`) -- the bundle's Markdown becomes the map; what Bear,
  Ulysses, and iA Writer export.
- **MindManager `.mmap`** -- see below.

You can **batch-import** several files at once, which turns a folder of outlines into a
library of maps in one step. (The list keeps growing -- Word `.docx`, Excel `.xlsx`, iThoughts
`.itmz`, MindMeister `.mind`, and older XMind files all open too.) These bridges cover the common
ground between tools; each keeps the topic tree and the fields that map cleanly, and -- like the
`.mmap` importer -- quietly leaves behind only the tool-specific extras it can't represent.

Not everything you want to map arrives as a file, though. Often it's just *text* -- an agenda in
an email, a list in a chat, the bones of an outline you typed somewhere else. **📋 Paste text**
takes that straight from the clipboard: paste it in and the indentation (or `#` heading levels)
becomes the tree, bullet and number markers are stripped, and you get topics. Drop it in as a new
map, or **Add under selected** to graft it onto a branch you're already growing. It's the lowest-
friction on-ramp there is -- and, because it never leaves the browser, the private way to bring in
an outline you drafted anywhere, including one a chatbot wrote for you.

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

## Going back in time

Exporting a `.json` is a snapshot you take on purpose; **version history** takes them for you. The
**🕔 History** panel keeps a running list of past states of the current map -- captured quietly as
you edit (every few minutes, not every keystroke) and whenever you click **Save version now**.
Each entry shows when it was taken and how big the map was; **Restore** rolls the map back to it.
The safety net under the safety net: restoring first checkpoints what you have *now*, so even an
unwanted restore is one click from undone. It's all local (capped at the 30 most recent, kept in
the browser's database) and travels with nothing -- a private undo that outlives the session, where
the in-session Undo (Chapter 2) stops at the last reload. Think of Backup as the whole-library
snapshot and History as the per-map flight recorder.

There's also a **▶ Play timeline** button: instead of eyeballing the list, play the snapshots back
in order and *watch* the map grow on the canvas -- step frame by frame, drag the scrubber to any
point, or let it auto-play. It's read-only while you watch, so nothing changes until you pick a
frame and hit **Restore this** (or **Exit**, or Esc, to drop back to the live map). On a map you've
been building for weeks, it's a quietly satisfying way to see how the thinking took shape.

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

Now get it out as a *picture* and as a *paste*. Export **PNG** (or **SVG** for a crisp,
scalable version) and drop it into a slide or a chat -- notice the labels, icons, arrows and
boundaries all render, because the image carries real text, not a screenshot. Export to
**PDF** when it needs to print, or to **Excel** when you want to sort and count the outline
as a spreadsheet. Finally, when you just need the words somewhere *now*, click **⧉ Copy
outline** and paste -- no file, no download, just the map as a Markdown outline wherever your
cursor is. Same map, every door out: a file to keep, a picture to show, a sheet to crunch, a
paste to drop.

The final chapter is about the most demanding kind of sharing: standing up and walking a
room through a map live.
