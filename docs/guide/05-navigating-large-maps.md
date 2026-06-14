# Navigating large maps

### Outline, find, collapse, and links between maps

A map with thirty nodes fits on a screen. A map with three hundred does not, and the
features that felt optional at small scale become the difference between a map you use
and a map you abandon. This chapter is about staying oriented.

## Collapse and expand

Every branch can be **collapsed** to hide its children behind its parent, and expanded
again to reveal them. Collapsing is how you control altitude: fold everything down to
the top two levels to see the shape of the whole plan, then open just the branch you're
working in. The toolbar's **collapse all** and **expand all** controls do it to the
whole map at once -- collapse-all then open one branch is the fastest way to present a
large map without overwhelming the room.

## Fit

Lost? The **Fit** button reframes the entire map to the viewport in one click. It's the
"take me home" of the canvas, and worth wiring into muscle memory: zoom in to work, hit
Fit to see where you are.

## The minimap and zoom

In the bottom-right corner sits a **minimap** -- a shrunk-down overview of the whole map,
with a highlighted rectangle showing the slice you're currently looking at. On a big map
it answers the question "where am I, and what else is out there?" at a glance. Click or
drag inside it to jump the main view somewhere else: the rectangle follows your pointer
and the canvas pans to match, so the minimap doubles as a fast way to travel across a map
too large to scroll comfortably.

Below it are the **zoom controls** -- minus, a live percentage, plus, and a fit button.
They do the same job as the mouse wheel but give you a precise readout and a deliberate
step, which matters when you're lining a map up for a screenshot or a screen-share. The
percentage tells you exactly how far in you are; the fit button is the same "take me home"
as **Fit** above, kept within thumb's reach of the zoom buttons.

## Layouts: the same map, different shape

The map's default shape -- a two-sided radial -- isn't the only way to read it. The **Layout**
dropdown re-flows the *same* nodes into a different arrangement, and which one reads best
depends on what the map *is*:

- An **org-chart** (top-down or bottom-up) suits a hierarchy: a team, a taxonomy, a decomposition.
- A **timeline** lays the first level out as a left-to-right sequence -- a roadmap, a process, the steps of an argument.
- A **fishbone** (the Ishikawa diagram) angles branches into a spine, the classic shape for cause-and-effect analysis.
- **Radial** fans every branch evenly around the root when you want the pure, balanced bloom.

Switching layout never changes your content -- only its geometry -- so it costs nothing to try
a few and keep the one that makes the structure obvious. A backlog that felt tangled as a radial
map can read as a clean timeline; a muddled list of problems snaps into focus as a fishbone.

## The outline panel

The **Outline** panel shows your map as an indented list -- the same tree, read top to
bottom instead of radiating outward. It's invaluable for three things: seeing the whole
structure linearly, jumping straight to a node (click it in the outline and the canvas
focuses it), and spotting structural problems a radial layout can hide, like a branch
that's gone six levels deep while its siblings stayed shallow.

The outline has its own **filter** box: type a few letters and it narrows to matching
topics, so a long map becomes a short list you can scan.

## The marker and tag index

The outline answers "where is this *topic*?" The **Index** panel (the **📑 Index** button)
answers a different question: "where is everything I *flagged*?" It collects every marker and
tag used anywhere in the map and lists them grouped by symbol -- a ❗ heading with the three
topics you marked urgent under it, a ⭐ heading with your favourites, and so on, each with a
count. Click a topic in the index and the canvas jumps to it, exactly like the outline.

This is the read-only twin of the **Markers** palette. The palette is how you *put* a marker on
the selected node; the index is how you *find* every node that already carries one. On a map with
a hundred topics, that's the difference between scanning the whole thing for red flags and reading
them off a list. Markers earn their keep precisely because the index makes them queryable after
the fact -- so flag deliberately, and the index becomes a live status board.

## Numbering the branches

A radial map is wonderful for thinking and terrible for *pointing*. "Look at the third sub-point
of the second branch" is a sentence no one wants to say. The **1. Numbering** toggle fixes that:
it stamps every topic with its outline number -- `1`, then `1.1`, `1.2`, then `1.2.1` -- on the
canvas and down the outline at once, so now you can just say "see 2.3" and everyone's eyes land in
the same place. The numbers follow into the PNG, PDF, and Office exports too, which is exactly when
you need them: a printed map handed round a meeting, or a slide that references a node by number.

It's worth being clear about what numbering *isn't*. It doesn't change your map. The numbers are
computed from the tree's shape the instant you switch it on and forgotten the instant you switch
it off -- they never touch your topic text, so search still finds "Budget" and not "4.2 Budget",
and a Markdown export is still clean prose. Reorder a branch and the numbers renumber themselves,
because they were never really yours to begin with -- they belong to the structure. Turn it on
when you need to talk *about* the map; turn it off when you just want to look *at* it.

## Filtering without losing the forest

There's a moment with every large map where you stop wanting to *see everything* and start wanting
to *see one thing*: every red flag, every node tagged `q3`, every topic that mentions "budget". The
**Filter** panel does that without throwing anything away. Type some text, or click the marker and
tag chips for what you're hunting, and the map answers by **fading everything that doesn't match** --
leaving the matches, and the branches that lead to them, at full strength. A count tells you how
many topics qualified.

The phrase to hold onto is *read-only*. A filter here is a spotlight, not a pair of scissors:
nothing is hidden, collapsed, or deleted, and the instant you hit **Clear** or close the panel the
whole map comes back. That's deliberate. The fastest way to lose trust in a tool is to have it
quietly remove something you needed; a filter that only changes opacity can never do that. The
context stays too -- because the path from the centre to each match keeps its colour, you never get
the disorienting "lone highlighted node floating in grey" that makes you forget where you are.

It pairs naturally with markers. Flag the risks as you build the map (Chapter 4), then, when the
map is big and the meeting is short, filter to ❗ and read the risks straight off the lit branches.
The markers are the *input*; the filter is the *question you ask of them later*.

## Find and replace

Press **/** anywhere to jump straight to **Find**. It searches both topics *and* notes,
so a term you only mentioned in a note is still findable. Matches are highlighted and you
can step between them. **Replace** turns find into a tidy-up tool: rename a project that
got called three slightly different things, fix a term you decided to change, all in one
pass.

> The `/`-to-find shortcut is the single most useful key on a big map. When you can't
> remember where something is, don't hunt -- press `/` and type.

## Links between maps

Some subjects are too big for one map. Rather than one sprawling canvas, MindMap Studio
lets you keep a **library** of maps (Chapter 7) and draw **cross-map links** between
them: a node in your *Strategy* map can link to your *Q3 Plan* map, so clicking it opens
the other map. This is how you build a small atlas instead of one unreadable continent --
a high-level map whose nodes are doorways into the detailed maps beneath them.

## Search every map

Find searches the map you're in. Once your library grows into an atlas, **🔎 All maps**
searches *all* of them at once -- every topic and note, floating topics included -- and
picking a result opens that map and lands on the node. It's the companion to cross-map
links: links are the doorways you placed on purpose, library search is for when you can't
remember which map a thing is in.

## A working rhythm for big maps

Put together, the loop looks like this: **collapse all** to see the shape, open the
branch you need, **/** to jump to a specific node, work, **Fit** to re-orient, repeat.
The outline panel stays open on the side as a table of contents. None of these moves is
clever on its own; the habit of using them together is what keeps a three-hundred-node
map feeling as manageable as a thirty-node one.

## Your workspace, remembered

The panels you work with -- the **Outline** on the side, the **Notes** editor -- stay how
you left them. Close the app with the outline open and it's open when you come back; the app
remembers your panel layout between sessions, so you don't rebuild your workspace every
morning. It's a small thing, but it's the difference between a tool that settles into your
habits and one you have to re-arrange every time you sit down.

## Now you try

Find (or build) a map big enough that it doesn't fit on screen. **Collapse all**, then open
just one branch and talk yourself through it. Press **/** and jump to a node you only
mentioned in a *note* -- prove to yourself that Find searches notes, not just topics. Open
the **Outline** panel and use its filter to narrow a long map to a short list. Zoom right in
on one node, then press **Fit** -- watch the whole map snap back into view; that's your
"take me home". If you keep more than one map, open **🔎 All maps** and search for a term you
know lives in a *different* one -- watch it open that map and land on the node. While you have
two maps, add a **cross-map link**: point a node in one at the other, then click it and watch
the app hop maps -- that's how a high-level map becomes a set of doorways into the detailed
ones beneath it. While you're here, flip the **Layout** dropdown between the radial default, an
org-chart, and a timeline -- same nodes, three readings -- and keep whichever makes the
structure clearest. Then **reload the page**: the Outline panel is exactly where you left it,
because the app remembered your workspace. The goal isn't to memorise the controls; it's to
feel how much calmer a big map gets when you drive it at the right altitude instead of staring
at the whole thing at once.

Part 3 turns outward: getting the map off your screen and in front of other people.
