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
