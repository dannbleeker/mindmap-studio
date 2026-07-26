import { type Catalogue, registerMessages } from "../../i18n/registry";

// English messages for the CANVAS — the topic node, its affordances and the on-canvas menus.
//
// These live here rather than in `i18n/core.ts` on purpose. The canvas is a ~100 kB LAZY chunk
// (`FlowMindMap`), so its strings belong in that chunk: putting them in the eager core catalogue would
// move them onto the initial-load path, which `scripts/size-budget.mjs` caps. Registration happens on
// import, so the messages arrive exactly when the canvas does.
//
// Imports `registerMessages` from `../../i18n/registry`, NOT from the `../../i18n` barrel — the barrel
// pulls in the eager core catalogue, which would defeat the whole arrangement. There's a test that
// asserts these strings are absent from the entry chunk.

export const CANVAS_EN = {
  // Inline rich-text toolbar (shown while editing a topic)
  "canvas.format.bold": "Bold (Ctrl/⌘+B)",
  "canvas.format.italic": "Italic (Ctrl/⌘+I)",
  "canvas.format.underline": "Underline (Ctrl/⌘+U)",
  "canvas.format.textColour": "Text colour {colour}",

  // Node affordances
  "canvas.node.relateGrip": "Drag onto another topic to link them",
  "canvas.node.wrapGrip": "Drag to set the topic's text-wrap width",
  "canvas.node.toggleTask": "Toggle task",
  "canvas.node.cycleTask": "Mark as task / done (cycle)",
  "canvas.node.showNote": "Show note",
  "canvas.node.positionLocked": "Position locked — right-click to unlock",
  "canvas.node.positionLockedShort": "Position locked",
  "canvas.node.rollUpSource": "Roll-up source",
  "canvas.node.addChild": "Add child (Tab)",
  "canvas.node.addSibling": "Add sibling (Enter)",
  "canvas.node.wrapWidth": "Wrap width: {width}. Drag or use arrow keys to change.",
  "canvas.node.editTopic": "Edit topic",
  "canvas.node.editTopicNamed": "Edit topic: {topic}",
  "canvas.node.followLink": "Follow link: {url}",
  "canvas.node.rollUpMirrors": 'Roll-up: mirrors "{title}" — Refresh roll-ups to pull the latest',
  "canvas.node.rollUpMirrorsUnknown":
    "Roll-up: this topic mirrors another map — Refresh roll-ups to pull the latest",
  // The collapsed-branch peek footer. Plural-formed even though English needs one wording for both
  // categories, because a locale that inflects "more" needs somewhere to put the second form.
  "canvas.node.moreChildren": { one: "…({n} more)", other: "…({n} more)" },

  // On-canvas menus raised from the editor
  "canvas.menu.insertCommand": "Insert command",
  "canvas.menu.linkToTopic": "Link to a topic",
  "canvas.menu.addTag": "Add a tag",
  // Trailing space is deliberate: the label reads "New tag: #foo", with the `#tag` in its own span.
  "canvas.slash.newTagPrefix": "New tag: ",
} as const satisfies Catalogue;

export type CanvasKey = keyof typeof CANVAS_EN;

registerMessages("en", CANVAS_EN);
