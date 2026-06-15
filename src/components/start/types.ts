import type { MindMapDoc } from "../../model/types";

// Shared types for the start screen.

/** The sidebar sections, in nav order. */
export type StartSection =
  | "start"
  | "all"
  | "recent"
  | "templates"
  | "layouts"
  | "import"
  | "learn"
  | "about";

/** Props every section view receives — read-only data + the one callback that lands a doc in the
 *  editor. Sections read the store directly for the live library; `onOpen` hands a built/loaded doc
 *  to App (which persists it + switches to the editor). */
export interface StartContext {
  /** Open a doc in the editor (App persists + switches view). Optional layout applies the editor's
   *  layout for that map (used by the Layouts section). */
  onOpen: (doc: MindMapDoc, layout?: string) => void;
  /** Hand dropped/picked files to App's import pipeline (lands the result in the editor). */
  onImportFiles: (files: File[]) => void;
  /** Jump to another section (deep links from Home). */
  go: (section: StartSection) => void;
  /** Library refresh tick — bumped after a delete/rename so sections re-read the store. */
  libraryRev: number;
  /** Notify App that the library changed (delete/rename/duplicate) so it can refresh. */
  onLibraryChange: () => void;
}
