# Structuring ideas

### Re-parenting, grouping, diagramming, and the links a tree can't hold

A first draft of a map is rarely in the right shape. A branch you started under *Venue*
turns out to belong under *Budget*; two ideas you thought were separate turn out to be
the same. Restructuring is not a failure -- it *is* the thinking. This chapter is about
moving things around without fear.

## Drag to re-parent

To move a node -- and everything beneath it -- to a new home, just **drag it onto its
new parent**. Drop `Catering` from under *Venue* onto *Budget* and the whole sub-branch
travels with it, re-coloured to match its new branch. There is no cut-and-paste dance;
the drag *is* the move. Because the underlying model updates atomically, **Ctrl+Z**
puts it back if you misjudged the drop.

A good habit: build fast and loose first -- get every idea onto the canvas as a node,
wherever -- then spend a second pass dragging things into the structure that emerges.
Trying to get the hierarchy right while you're still generating ideas slows both down.

## Copy a branch -- here, or in another map

Dragging *moves* a branch; sometimes you want a *copy* -- the same sub-tree in two places, or a
structure you built in one map reused in another. **Right-click** a topic and choose **Copy
branch**; then right-click where it should go and choose **Paste branch here** to graft a fresh
copy -- the node and everything beneath it -- under that parent. Every pasted node gets a new
identity, so the copy is genuinely independent: edit it and the original doesn't budge.

The quietly useful part is that the clipboard **crosses maps**. Copy a branch in your *Q3 Plan*,
open your *Q4 Plan*, and paste it in -- a standard checklist, a risk list, a team structure you
keep re-using no longer has to be rebuilt each time. It's the middle ground between the drag (which
only moves things within one map) and a full file import (which brings in a whole map): a way to
carry just the piece you want from one map to the next.

## Layout direction

By default MindMap Studio balances branches on both sides of the root. For some maps a
one-sided layout reads better -- an agenda or a process that flows top-to-bottom in your
head often wants everything going **right**. The layout control in the toolbar switches
between **both**, **right**, and **left**. It's a view setting; it changes nothing about
the structure, so flip it freely to see which framing helps.

## Boundaries: grouping a branch

Sometimes a branch needs to be visibly *a thing*: "everything in here is out of scope",
"this cluster is Phase 1". Select the node at the top of the branch and click **⬚ Group**:
a shaded, rounded **boundary** box is drawn around it and all its descendants, and
double-clicking the box's label chip lets you name it. The boundary follows the branch as you
edit it, so it keeps enclosing the right nodes even after you add or move children.

Boundaries are the right tool when the grouping is *hierarchical* -- it lines up with a
single branch. When the grouping cuts across the tree, you want the next feature instead.

## Relationships: the arrows across the tree

The tree is good at "X is part of Y". It is silent about "X depends on Y" when X and Y
live on different branches. That's what **relationships** are for: draw an arrow from
one node to another, anywhere on the canvas, and you've recorded a link the hierarchy
couldn't express. A risk on the *Budget* branch that threatens a deliverable on the
*Programme* branch; a decision that unblocks three others; a "see also". Use them
sparingly -- a map laced with dozens of arrows is as hard to read as no structure at
all -- but a handful of well-placed relationships often carry the most important
information on the page.

> **Keep the tree honest.** Before drawing a relationship, ask whether the two nodes
> are really on different branches, or whether one should simply be re-parented under
> the other. An arrow is the right answer for genuine cross-links; it's the wrong answer
> for a hierarchy you just haven't tidied yet.

Once you have a few of these arrows, some of them will inevitably cross. Where two lines
overlap, the eye can't tell whether they pass over each other or join -- and a false junction
quietly tells the wrong story. Turn on **⌒ Line jumps** in the toolbar and the problem
disappears: at every crossing, one of the two arrows lifts into a small **hop** over the other,
the way a well-drawn wiring diagram or transit map keeps its lines legible. It's a per-map
switch, so leave it off for sparse maps and flick it on the moment your arrows start to tangle;
either way the hops are baked into your exports exactly as you see them on screen.

## Floating topics

Not everything has to connect to the root. A **floating topic** is a node (or small
sub-tree) that sits on the canvas unattached -- a parking lot for ideas you're not ready
to place, a caption, a note-to-self. MindMap Studio renders floating topics imported from
other tools in a labelled "Floating topics" branch -- and they're fully editable, so they
double as a staging area you can rename, grow, and prune while you decide where something
belongs. Drag one onto a branch and it joins the tree; drag a branch topic out and it
floats free.

## Sticky notes

A floating topic is still a *topic* -- a node you might grow into a branch. Sometimes you want
something lighter: a remark on the canvas that isn't part of the structure at all. The **🗒 Note**
button drops a **sticky note** -- a free-floating amber card you can drag anywhere and type into.
Use it for the things that hover *around* a map rather than *in* it: a "finish before Friday" to
yourself, a caption over a cluster, a question for whoever you hand the map to. It's the canvas
equivalent of a Post-it stuck to the whiteboard -- visible, movable, and plainly a note rather than
a part of the tree. (For a remark pinned to *one specific node*, reach for a callout instead,
Chapter 4; the sticky note is the free-floating kind.)

## Summary topics

A boundary draws a box *around* a branch; a **summary** draws a labelled bracket *beside*
one and says what it adds up to. Select the node at the top of a branch, click **⌐ Summary**,
and a curly brace appears alongside it with an editable label -- "three options", "Q3 total",
"needs sign-off". Where a boundary says *these belong together*, a summary says *here's the
conclusion*. It's side-aware, so on a two-sided map the bracket sits on the outer edge where it
reads naturally, and double-clicking its label renames it. Reach for a summary when a branch has
a punchline -- a total, a verdict, a next step -- you want on the page without adding another node.

## Editing an overlay: the inspector

Boundaries, summaries, and callouts aren't just drawn-and-forgotten -- each is a thing you can come back to. **Click** any of them once and the right-hand panel switches to an **overlay inspector** for that object. There you rename it (the box's label, the bracket's caption, the callout's text), re-tint it from a small set of swatches -- the colour carries through to every export -- and, for a boundary, switch its shape (rounded, square, ellipse, cloud, polygon) and its outline (solid, dashed, dotted). A **Delete** button at the foot removes the overlay without touching the nodes underneath; the branch and its topics stay exactly where they were.

So if a Phase 1 boundary you drew earlier should now read as out-of-scope, click it, dash its outline and recolour it grey -- the grouping is the same, the signal is softer. And when a summary bracket has served its purpose, click it and delete it; the conclusion goes, the branch remains.

## A vocabulary of shapes

By default every topic is a soft rectangle, and for most maps that's exactly right -- the
*words* carry the meaning. But when a map is really a **process or a decision flow**, shape
becomes meaning. Select a node, open the **Style tab** (in the ℹ Info panel), and you can recast it as a
**diamond** (a decision -- "approved?"), an **oval** (a start or end point), a **parallelogram**
(an input or output), a **hexagon** (a preparation step), or a **cylinder** (a data store).
These are the classic flowchart shapes, and they read instantly to anyone who's seen one: a
diamond *asks*, an oval *bookends*, a cylinder *stores*.

When the five classics aren't quite the picture in your head, the Style bar keeps going. A
**trapezoid** marks a manual operation; an **octagon** says *stop* or *limit*; a **document** --
a page with a softly waving bottom edge -- stands for a report or a printed output; a **callout** is
a rounded speech bubble for an aside or an annotation; a **star** flags the one node that matters
most; and a **cloud** is the universal shorthand for a loose idea or an external system you don't
control. The concave ones (the star and the cloud especially) quietly pull their text inward so a
long label never spills past the outline. Every one of these is drawn the same way on the canvas
and in every export, so a flowchart you build here looks like a flowchart in the PNG, the PDF, and
the Office decks. Use a shape when the geometry adds information; leave the soft rectangle when the
word is enough.

## Free-canvas mode

Auto-layout is a gift -- it keeps a growing tree tidy so you never nudge boxes around by hand.
But some pictures aren't trees, and for those the tidy reflow gets in the way. Toggle
**🧲 Free layout** and the auto-arranger steps aside: now you can **drag any node anywhere** and
it stays put, its position saved with the map. This is the mode for a whiteboard-style diagram --
a system sketch, a seating plan, a freeform cluster of ideas -- where *where* a node sits is part
of what it means. Switch Free layout off again and the tree snaps back to its automatic shape,
every hand-placed position still remembered for when you turn it back on. It's the escape hatch
from the grid, not a replacement for it: most maps want the auto-layout, and the handful that
don't want it badly.

## Diagram backdrops: onion, funnel, Venn

Sometimes the *frame* carries the idea. The **◎ Diagram** builder drops a geometric backdrop
behind your topics for you to place them into: an **onion** of concentric rings (core to
periphery -- values, then strategy, then tactics), a **funnel** of stacked stages narrowing to a
point (a pipeline, a filtering process; **−/+** changes the stage count), or a **Venn** of two or
three overlapping circles (what's shared versus what's distinct). The backdrop is pure geometry --
it pairs naturally with Free layout above, since you're positioning topics into regions by hand --
and, like shapes, it's drawn identically on screen and in every export, so the diagram you build
is the diagram you hand out.

## A different layout for one branch

Chapter 5 covers the **Layout** dropdown, which re-flows the *whole* map into an org-chart, a
timeline, a fishbone, and more. Occasionally a single *branch* wants a different shape from the
rest -- an org-chart of the team hanging off an otherwise radial strategy map. Right-click the
branch and choose **Branch layout** to give just that subtree its own arrangement. The override
is sized as one block in the main layout so it never collides with its siblings, and overrides
nest -- a branch inside the branch can have its own again. It's a precision tool; most maps never
need it, but when one section is a fundamentally different kind of thing, this is how you let it
look like one.

## Now you try

Open your conference map (or any map with a few branches). Pick a leaf that sits under the
wrong parent and **drag it** where it belongs -- watch the whole sub-branch travel and
re-colour. Then choose one branch that's genuinely "a thing" and give it a **boundary**.
Finally, find two nodes on *different* branches that depend on each other and draw a
**relationship** arrow between them. Step back: the tree now carries the hierarchy, the
boundary carries the grouping, and the arrow carries the one link the tree couldn't. If you
can't find a real cross-branch link, that's a good sign -- don't invent one.

Two more moves worth a try. Flip the **layout direction** to right-only and back -- same
structure, a different shape on the page; keep whichever frames the map better. Then drag a
branch topic *out* into open space to make it a **floating topic** -- a parking lot for an
idea you're not ready to place -- and drag it back onto a branch to re-attach it. Structure
isn't a cage; it's something you reshape as the thinking firms up.

If your map is more diagram than tree, try the diagramming tools too. Cap a branch with a
**⌐ Summary** that states its punchline. Turn a node into a **diamond** from the **Style bar**
and watch the decision read at a glance. Or toggle **🧲 Free layout** and drag a few nodes into a
shape you choose by hand -- then turn it off and watch the tree snap back, your positions
remembered. None of these replace the tree; they're there for the maps the tree alone can't draw.

Three more moves for the maps that need them. Right-click a single branch and choose **Branch
layout** -- give just that sub-tree an org-chart while the rest of the map stays radial; the
layouts compose, so one busy branch can read its own way without reshaping anything else. When a
map is really a framework, open the **Diagram builder** and drop topics into an onion, a funnel,
or a Venn backdrop -- the frame carries the meaning so the labels don't have to. And reach past
the diamond: the shape menu also holds a trapezoid, octagon, document, star, and cloud, each drawn
identically on the canvas and in every export. One last doorway -- when two far-apart topics refer
to each other but aren't a true dependency, give one a **jump link** to the other; clicking it
flies the canvas to the target, the connection without the arrow. (You can also drop a web link or
a block of text straight onto empty canvas and watch it land as a floating topic, ready to place.)

If you drew a boundary or a summary above, **click it once** now: the inspector opens on the right.
Rename it, pick a colour, and -- for a boundary -- try the dashed outline. Then **delete** one and
watch the branch underneath stay put; the grouping was never holding the nodes, only enclosing them.
Now draw a second **relationship** arrow that crosses the first, then turn on **⌒ Line jumps** in
the toolbar. Where the two lines met as an ambiguous junction, one now lifts in a small hop over the
other and the crossing reads cleanly. Toggle it off and the hop vanishes -- it's a per-map switch,
so save it for the moment your arrows start to tangle. Either way, export the map and the hops come
through exactly as you see them.

Two quick reuse moves to finish: **right-click a branch → Copy branch**, then paste it under
another node -- or even into a *different* map -- and notice the copy is independent of the
original. And drop a **🗒 sticky note** somewhere with a reminder to yourself: a remark that rides
*with* the map without becoming part of its tree.

With structure under control, the next chapter makes individual nodes carry more.
