# The anatomy of a map

### A handful of ideas the whole app rests on

You can use MindMap Studio without ever reading this chapter. But ten minutes here will
make every later feature feel obvious instead of arbitrary, because they all act on the
same small set of parts.

## The shape: one centre, many branches

A mind map is a tree with a single root in the middle and branches radiating outward.
The classic starting point is a central idea surrounded by the six questions every
plan eventually has to answer:

<!-- DIAGRAM:first-map -->

This is exactly what the built-in **Brainstorm** template gives you (you'll meet the
other templates in Chapter 7). Each branch can grow its own children, and theirs can
grow more, as deep as the thought goes. The radial shape isn't decoration: putting the
subject in the centre keeps every branch equidistant from it, so no single line of
thinking dominates just because it happens to be at the top of a list.

## The node: the only real object

Everything on the canvas is a **node**. A node has:

- a **topic** -- the text you see;
- an optional set of **markers** -- small icons or tags (Chapter 4);
- an optional **note** -- longer prose attached behind the node (Chapter 4);
- an optional **image**;
- and **children** -- the nodes hanging off it.

The root is just a node that happens to have no parent. A leaf is just a node with no
children. There is no special "task" type or "milestone" type -- MindMap Studio keeps
the model deliberately small. That smallness is why import, export and undo all behave
predictably: there are fewer kinds of thing to get wrong.

## Two things that aren't nodes

Two features draw on the canvas without being part of the tree:

- A **boundary** is a soft outline drawn around a node and everything beneath it,
  grouping a branch visually ("everything in here is Phase 1").
- A **relationship** is an arrow drawn from one node to another, expressing a link
  that the tree structure can't -- a dependency, an influence, a "see also" across
  branches.

Both are covered in Chapter 3. The point for now: the tree carries the *hierarchy*,
and these two carry the *exceptions* to it.

## The canonical model

Under the surface, your map is a plain data structure -- a root node, its children,
each node's topic and notes and markers. MindMap Studio treats that structure as the
single source of truth. The colourful canvas is one *view* of it; the outline panel
(Chapter 5) is another; an exported Markdown file is a third. Edit the map on the
canvas and the underlying model updates; every other view follows.

This is worth internalising because it explains the app's most reassuring property:
**what you see is always backed by real data you can take with you.** A map is never
trapped in a proprietary blob. Chapter 6 shows you how to round-trip it through
Markdown, JSON, OPML and more -- losslessly, in the case of JSON.

With the parts named, the rest of the book is just learning what you can do to them.
