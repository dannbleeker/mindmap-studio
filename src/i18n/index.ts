// The i18n barrel — import `t` (and friends) from here, never from `./registry`.
//
// The side-effect import below is load-bearing, and it exists because of a real failure: registration
// originally happened in `main.tsx`, which meant every entry point that ISN'T main.tsx — the test
// suite, and equally any future embed or story — got a working `t()` over an EMPTY registry, so every
// call threw "no message for key". Making the barrel pull in the catalogue means "can call `t()`" and
// "the English messages exist" are the same fact, and can't drift apart by import order.
//
// A lazy feature's catalogue registers itself the same way, from its own chunk, and imports
// `registerMessages` from `./registry` directly — importing this barrel instead would drag the eager
// core catalogue into that chunk.
import "./core";

export type { Catalogue, Locale, Message, MessageVars } from "./registry";
export {
  DEFAULT_LOCALE,
  LOCALE_PREF_KEY,
  LOCALES,
  applyDocumentLocale,
  collator,
  compareText,
  directionOf,
  getLocale,
  initLocale,
  registerMessages,
  resolveLocale,
  setLocale,
  t,
} from "./registry";
