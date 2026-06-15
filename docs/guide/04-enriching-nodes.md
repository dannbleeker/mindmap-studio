# Enriching nodes

### Notes, markers, images, and making a map look like it means it

A bare tree of labels is often enough. But a node can carry far more than its topic,
and used with restraint, that extra detail turns a sketch into a document you can hand
to someone else.

## Notes: the prose behind the bubble

A topic should stay short. The paragraph it deserves goes in a **note**. Select a node,
open the **Notes** panel, and write. Notes accept **Markdown** -- headings, bold and
italic, bullet lists, inline `code`, and links -- and the panel shows a live preview, so
the formatting you type is the formatting you get.

Notes are where a map stops being a brainstorm and becomes a brief. The node says
*Vendor decision*; the note records the three options, the criteria, and why you chose
the one you did. The canvas stays scannable; the detail is one click away on whichever
node owns it.

## Markers: status at a glance

A **marker** is a small icon or tag pinned to a node. Open the **Markers** palette and
click to toggle one on the selected node: a priority flag, a tick, a question mark, a
face. Markers are how a map carries *state* without words -- a row of green ticks and
one red flag tells a reviewer where to look before they've read a single label.

Pick a small vocabulary and stick to it. "Red flag means blocked, tick means done,
question mark means undecided" is a convention a whole team can read at a glance; fifteen
different icons used once each is just clutter.

> Markers imported from a MindManager `.mmap` file are mapped to the closest emoji, so a
> map you bring in from elsewhere keeps its visual cues rather than arriving as bare text.

## Tasks: when a topic is also a job

A marker says *this is urgent*; a **task** says *this is work, and here's where it stands*.
Open the **ℹ Info** panel and a node can carry three task fields: a **progress** slider (0 to
100%), a **priority** (high, medium, low), and **start** and **due** dates. Together they turn a
branch of a plan into something you can actually track.

Progress **rolls up**: set the leaves and a parent shows the average of its children, so the top
of a branch reports how far the whole thing has come without your doing the sum. Due dates work
the same way -- a topic past its date is flagged **overdue** on the canvas, so a plan that's
slipping says so out loud. None of this turns MindMap Studio into a project planner; it makes a
*map* enough of one that you don't have to leave it to see what's done, what's next, and what's
late. (Chapter 5's filter and board then let you ask the whole map "what's overdue?" at once.)

## Images

A node can hold an **image** -- a screenshot, a logo, a photographed whiteboard, a chart.
Attach one to the selected node and it renders inline on the canvas. An image is worth a
paragraph of note when the thing you're describing is itself visual.

Sometimes you don't have a file to hand -- you just want a small visual cue: a **star** on the
idea you're proudest of, a **warning** triangle on the risk, a **flag** on the decision still
open. For that, the **ℹ Info** panel keeps a built-in grid of **stickers**: twenty clean little
illustrations -- star, heart, check and cross badges, lightbulb, target, rocket, lock, clock, fire,
and more -- in one quiet accent colour so they read as a set rather than a circus. Click one and it
lands on the selected node. Behind the scenes a sticker simply *becomes* that node's image, which is
the whole trick: it renders on the canvas and travels into every export exactly like a picture you
supplied yourself, with nothing new to learn. A node holds one image at a time, so picking a new
sticker (or a real photo) swaps out the last. Used sparingly -- one or two on the nodes that carry
the most weight -- a sticker pulls the eye to what matters without a word.

## Attachments: files that travel with the node

An image renders *on* the node; an **attachment** rides along *with* it. From the **ℹ Info**
panel you can attach a file to the selected topic -- a spec, a contract, a spreadsheet -- and
it's stored inside the map itself, so it travels in the JSON export and is there even offline,
one click from downloading again. Reach for an attachment when the source document matters but
doesn't belong on the canvas: the node says *Vendor contract*, the file *is* the contract, kept
with the idea it backs up.

## Styling: shape, fill, border, font

Beyond markers, individual nodes can be **styled**: change a node's shape, fill colour, border,
or weight; bump a topic's font size or colour; and switch its **font family** from the **Font**
picker -- the default sans-serif, a **serif** for a quieter, document-like topic, or **monospace**
for code, IDs, and anything that should line up. Styling earns its keep when it
*encodes* something -- the three "decision" nodes all share a fill, the headline branch
is bolder than the rest -- and costs you readability when it's merely decorative. Style
to create a pattern the reader can rely on, not to make the map "pop".

## Styles you can reuse, formatting that follows the data

Hand-styling one node at a time is a scalpel; two features in the **🎨 Styles** panel (the toolbar
button, not the per-node Style bar above) make styling *systematic*.

A **named style** saves a look so you can reuse it. Dress one node the way you want -- fill,
border, font, weight -- save it under a name, and from then on a click applies that exact look to
any selected topic, in this map or any other. "Our decision nodes look like *this*" stops being
something you redo by hand; the styles you save are kept app-wide, so a visual language you settle
on follows you across the whole library.

**Conditional formatting** goes further and styles nodes *by what they are*. Write a rule --
"anything tagged `risk` gets a red border", "anything 100% complete goes grey", "every node with a
❗ marker turns amber" -- and the map applies it everywhere, live, and keeps applying it as you
edit. Where a named style is a look you *apply*, a conditional rule is a look that *follows the
data*: tag a new node `risk` and it goes red without your touching the Style bar. On a big, changing
map that's the difference between formatting you maintain and formatting that maintains itself.

## Rich text: emphasis inside a topic

Styling paints the whole node; sometimes you want to stress just a word or two *inside* the
label. While editing a topic, **Ctrl+B**, **Ctrl+I**, and **Ctrl+U** bold, italicise, or
underline the selection -- the same muscle memory as any editor. Reach for it sparingly: one
bold word that names the decision, an italicised term you're defining. The plain text is kept
underneath, so your outline and every flat export stay clean even when the canvas is dressed up.

## Callouts: a note that points

A **callout** is a small sticky note pinned beside a node -- a caveat, an open question, a
"revisit this" -- without promoting it to a child topic. Right-click a node, choose **Add
callout**, then double-click the bubble to write in it. Unlike a note, which lives *behind* the
node one click away, a callout sits *on the canvas*, visible at a glance and drawn into your
image exports -- the right tool for the one remark a reader must not miss. Like markers, their
power is in scarcity: a map speckled with callouts has none.

## Themes: the whole canvas at once

Where per-node styling is a scalpel, a **theme** is a coat of paint for the entire map.
The theme gallery offers a few presets -- **Light**, **Dark**, **Ocean**, **Sunset** --
each a coordinated palette for the background, branches and text. Dark themes read well
on a projector in a dim room; light themes print cleanly. Switching theme never touches
your content, so try a few and keep whichever helps you see the map.

The **Canvas** colour control sits one notch below a theme: it overrides just the background of
*this one map*, leaving the theme's branch and text palette intact. It's a quiet but useful signal
when you keep many maps -- a faint green wash on the "ideas" map, a warm one on "risks" -- so you
know which map you're in at a glance. The colour saves with the map and follows it into an image or
PDF export; the **✕** clears it back to the theme.

Right beside it, the **🖼** button goes a step further and lets you drop a whole **image** behind the
map -- a faint grid, a watermark, a photograph of the whiteboard you're rebuilding, your team's brand
backdrop. Pick a file and it fills the canvas behind every topic, sitting on top of the background
colour (so a transparent PNG lets that colour glow through the gaps). The picture is shrunk to a sane
size and tucked inside the map itself, so the map stays a single portable file you can open offline --
and, like everything else here, what you see is what you get: the backdrop travels into your SVG, PNG,
PDF and HTML exports unchanged. Use it sparingly, though; a busy photo behind your topics fights the
words for attention, and the map is there for the words. The second **✕** lifts the image back off.

## A note on restraint

Every feature in this chapter can be overused. The test is always the same: *does this
make the map easier to think with?* A note that captures a decision -- yes. A marker
convention a team shares -- yes. Six fonts and a gradient on every node -- no. The most
useful maps are usually the plainest ones with enrichment applied exactly where it
carries meaning.

## Now you try

Take a node that's carrying too much in its label and move the detail into a **note** (open
the Notes panel and write a sentence or two in Markdown). Shorten the topic to a handful of
words. Then agree a tiny **marker** convention with yourself -- say, a flag for "blocked"
and a tick for "done" -- and apply it to three or four nodes. Read the map again: the canvas
should be more scannable than before, with the depth one click away. If you reach for a
fifth marker colour, stop -- the small vocabulary is the point.

Now add a layer of meaning. Attach an **image** to one node -- a screenshot or a logo -- and
watch it render inline. Pick three related nodes (say, the ones that represent decisions) and
give them a shared **fill** from the Style bar so the pattern reads at a glance; bump your
headline branch's **font** up a size so the eye starts there. Finally, open the **theme**
gallery and switch between Light and Dark -- your content doesn't change, only its coat of
paint, so keep whichever helps you see the map. The rule throughout: styling that *encodes*
something earns its place; styling that merely decorates doesn't.

Finally, dress one topic up *inside* its label -- bold the single word that names what it is
(**Ctrl+B** while editing) -- and pin a **callout** to the node you're least sure about,
holding the question you still need to answer. Notice how differently the two read: the bold
word is part of the idea; the callout hovers beside it, plainly a comment on the work rather
than the work itself.

Finally, make a node carry *work*, not just words. In the **ℹ Info** panel give a topic a **due
date** and drag its **progress** to half-done -- watch the parent branch show the rolled-up total
and the canvas flag anything overdue. Then open the **🎨 Styles** panel, write one **conditional
rule** (tag a node `risk`, have the rule paint it red), and add that tag to a second node: it turns
red on its own. That's the chapter in miniature -- a node that tracks its own status, and
formatting that follows the data instead of waiting for your hand.

The next chapter is about the opposite problem: when a map gets big, how do you keep
finding your way around it?
