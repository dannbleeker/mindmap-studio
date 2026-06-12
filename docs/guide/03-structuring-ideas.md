# Structuring ideas

### Re-parenting, grouping, and the links a tree can't hold

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
"this cluster is Phase 1". Select the node at the top of the branch and add a
**boundary** -- a soft rounded outline is drawn around it and all its descendants. The
boundary follows the branch as you edit it, so it keeps enclosing the right nodes even
after you add or move children.

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
to place, a caption, a note-to-self. MindMap Studio renders floating topics imported
from other tools, and they're handy as a staging area while you decide where something
belongs.

With structure under control, the next chapter makes individual nodes carry more.
