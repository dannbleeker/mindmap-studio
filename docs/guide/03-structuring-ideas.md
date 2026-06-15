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

## Floating topics

Not everything has to connect to the root. A **floating topic** is a node (or small
sub-tree) that sits on the canvas unattached -- a parking lot for ideas you're not ready
to place, a caption, a note-to-self. MindMap Studio renders floating topics imported from
other tools in a labelled "Floating topics" branch -- and they're fully editable, so they
double as a staging area you can rename, grow, and prune while you decide where something
belongs. Drag one onto a branch and it joins the tree; drag a branch topic out and it
floats free.

## Summary topics

A boundary draws a box *around* a branch; a **summary** draws a labelled bracket *beside*
one and says what it adds up to. Select the node at the top of a branch, click **⌐ Summary**,
and a curly brace appears alongside it with an editable label -- "three options", "Q3 total",
"needs sign-off". Where a boundary says *these belong together*, a summary says *here's the
conclusion*. It's side-aware, so on a two-sided map the bracket sits on the outer edge where it
reads naturally, and double-clicking its label renames it. Reach for a summary when a branch has
a punchline -- a total, a verdict, a next step -- you want on the page without adding another node.

## A vocabulary of shapes

By default every topic is a soft rectangle, and for most maps that's exactly right -- the
*words* carry the meaning. But when a map is really a **process or a decision flow**, shape
becomes meaning. Select a node, open the **🎨 Styles** bar, and you can recast it as a
**diamond** (a decision -- "approved?"), an **oval** (a start or end point), a **parallelogram**
(an input or output), a **hexagon** (a preparation step), or a **cylinder** (a data store).
These are the classic flowchart shapes, and they read instantly to anyone who's seen one: a
diamond *asks*, an oval *bookends*, a cylinder *stores*. The shape is drawn the same way on the
canvas and in every export, so a flowchart you build here looks like a flowchart in the PNG, the
PDF, and the Office decks. Use a shape when the geometry adds information; leave the soft
rectangle when the word is enough.

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
**⌐ Summary** that states its punchline. Turn a node into a **diamond** from the 🎨 Styles bar
and watch the decision read at a glance. Or toggle **🧲 Free layout** and drag a few nodes into a
shape you choose by hand -- then turn it off and watch the tree snap back, your positions
remembered. None of these replace the tree; they're there for the maps the tree alone can't draw.

With structure under control, the next chapter makes individual nodes carry more.
