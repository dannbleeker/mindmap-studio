// Marker palette shown in the UI; emoji render as node markers on the canvas.
export const MARKER_PALETTE = [
  "✅",
  "❗",
  "❓",
  "⭐",
  "🚩",
  "📌",
  "🔴",
  "🟡",
  "🟢",
  "⏳",
  "💡",
  "🎯",
];

// Map common MindManager stock-icon names (urn:mindjet:<Name>) to emoji so
// imported icons render as glyphs instead of literal text. Unknown names are
// kept as-is so no information is lost. Matched case-insensitively.
const MM_ICON_MAP: Record<string, string> = {
  priority1: "1️⃣",
  priority2: "2️⃣",
  priority3: "3️⃣",
  priority4: "4️⃣",
  priority5: "5️⃣",
  priority6: "6️⃣",
  priority7: "7️⃣",
  priority8: "8️⃣",
  priority9: "9️⃣",
  thumbsup: "👍",
  thumbsdown: "👎",
  flag: "🚩",
  flagred: "🚩",
  flaggreen: "🚩",
  flagblue: "🚩",
  flagorange: "🚩",
  flagpurple: "🚩",
  smileyhappy: "🙂",
  smileyneutral: "😐",
  smileysad: "🙁",
  check: "✅",
  tick: "✅",
  taskcomplete: "✅",
  yes: "✅",
  cross: "❌",
  no: "❌",
  cancel: "❌",
  star: "⭐",
  important: "❗",
  exclamation: "❗",
  question: "❓",
  help: "❓",
  idea: "💡",
  arrowup: "⬆️",
  arrowdown: "⬇️",
  arrowleft: "⬅️",
  arrowright: "➡️",
};

export function mindManagerIconToEmoji(name: string): string {
  return MM_ICON_MAP[name.trim().toLowerCase()] ?? name;
}

// Curated inverse for the `.mmap` writer: emoji -> a single canonical MindManager IconType (PascalCase,
// as MindManager emits `urn:mindjet:<Name>`). MM_ICON_MAP is many-to-one (🚩 has 6 source names, ✅ has
// 4), so the inverse must pick one canonical name per emoji — a colour-flag variant collapses to `Flag`,
// etc. Emoji with no MindManager stock-icon equivalent (📌 🔴 🟡 🟢 ⏳ 🎯) are intentionally absent and
// skipped by the writer rather than emitted as junk IconTypes. Round-trips via mindManagerIconToEmoji.
const EMOJI_TO_MM: Record<string, string> = {
  "1️⃣": "Priority1",
  "2️⃣": "Priority2",
  "3️⃣": "Priority3",
  "4️⃣": "Priority4",
  "5️⃣": "Priority5",
  "6️⃣": "Priority6",
  "7️⃣": "Priority7",
  "8️⃣": "Priority8",
  "9️⃣": "Priority9",
  "👍": "ThumbsUp",
  "👎": "ThumbsDown",
  "🚩": "Flag",
  "🙂": "SmileyHappy",
  "😐": "SmileyNeutral",
  "🙁": "SmileySad",
  "✅": "Check",
  "❌": "Cross",
  "⭐": "Star",
  "❗": "Important",
  "❓": "Question",
  "💡": "Idea",
  "⬆️": "ArrowUp",
  "⬇️": "ArrowDown",
  "⬅️": "ArrowLeft",
  "➡️": "ArrowRight",
};

/** A canonical MindManager IconType for an emoji marker, or null when MindManager has no equivalent
 *  (the `.mmap` writer then omits it). Pure + deterministic. */
export function emojiToMindManagerIcon(emoji: string): string | null {
  return EMOJI_TO_MM[emoji.trim()] ?? null;
}

// ── Flat vector marker icons ──────────────────────────────────────────────────────────────────────
// A flat, single-family icon set replacing the OS colour emoji — crisp at node size and IDENTICAL on
// every machine and in every export (emoji render differently per platform + rasterizer). Keyed by the
// SAME palette characters stored on nodes, so existing maps render unchanged; an unknown marker (an
// imported glyph not in the set) falls back to its literal character. Authored on a 0 0 16 16 viewBox
// and emitted as a `data:image/svg+xml` URL, so each flows through the proven node-image / sticker
// pipeline (canvas `<img>`, export `<image>`) — no new render path, and canvas == export.
const sq = (fill: string): string =>
  `<rect x="1" y="1" width="14" height="14" rx="3.5" fill="${fill}"/>`;
const dot = (fill: string): string => `<circle cx="8" cy="8" r="5.4" fill="${fill}"/>`;

const MARKER_BODY: Record<string, string> = {
  "✅": `${sq("#2e9e5b")}<path d="M4.4 8.3l2.2 2.2 4.9-5.1" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  "❗": `${sq("#e23b3b")}<rect x="7" y="3.4" width="2" height="5.7" rx="1" fill="#fff"/><circle cx="8" cy="11.9" r="1.15" fill="#fff"/>`,
  "❓": `${sq("#3b8bd4")}<text x="8" y="12.3" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#fff">?</text>`,
  "⭐": `<path d="M8 1.6L9.5 5.94 14.09 6.02 10.42 8.79 11.76 13.18 8 10.55 4.24 13.18 5.58 8.79 1.91 6.02 6.5 5.94Z" fill="#f4b400"/>`,
  "🚩": `<rect x="3.4" y="2" width="1.5" height="12" rx="0.7" fill="#7a5230"/><path d="M4.9 2.6h7.4l-2 2.5 2 2.5H4.9z" fill="#e23b3b"/>`,
  "📌": `<circle cx="8" cy="6" r="3.6" fill="#e0683b"/><circle cx="8" cy="6" r="1.4" fill="#fff" opacity="0.5"/><rect x="7.3" y="8.8" width="1.4" height="5.2" rx="0.7" fill="#9a4a28"/>`,
  "🔴": dot("#e23b3b"),
  "🟡": dot("#f4b400"),
  "🟢": dot("#2e9e5b"),
  "⏳": `<path d="M4 3.2h8M4 12.8h8" stroke="#9a6b2f" stroke-width="1.5" stroke-linecap="round"/><path d="M5 3.6h6L8 8z" fill="#e0a72e"/><path d="M5 12.4h6L8 8z" fill="#e0a72e"/>`,
  "💡": `<circle cx="8" cy="6.5" r="4" fill="#f4c430"/><rect x="6.2" y="10" width="3.6" height="3.4" rx="1" fill="#9a8a5a"/><rect x="6.6" y="11.4" width="2.8" height="0.8" fill="#fff" opacity="0.55"/>`,
  "🎯": `<circle cx="8" cy="8" r="6" fill="#e23b3b"/><circle cx="8" cy="8" r="3.9" fill="#fff"/><circle cx="8" cy="8" r="1.8" fill="#e23b3b"/>`,
};

/** The flat vector icon for a marker as a `data:` URL, or null if it has no vector (→ render the
 *  literal character). Pure + deterministic. */
export function markerImage(icon: string): string | null {
  const body = MARKER_BODY[icon];
  if (!body) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
