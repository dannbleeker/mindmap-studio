import { type RefObject, useEffect } from "react";
import { fileToMapImage } from "../io/image";
import type { MindMapHandle } from "../mindmap";

// Paste an image from the clipboard (Ctrl/⌘+V) onto the selected topic — unless focus is in a text
// field / note editor, so ordinary text paste still works there. Reuses the node-image pipeline.
// Lifted verbatim out of App; the window listener is only attached while `enabled` (editor view).

export function useClipboardImagePaste(
  enabled: boolean,
  mapRef: RefObject<MindMapHandle | null>,
  showHint: (message: string) => void,
): void {
  useEffect(() => {
    if (!enabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      (async () => {
        try {
          const image = await fileToMapImage(file);
          const ok = mapRef.current?.setSelectedImage(image);
          showHint(
            ok
              ? "Image pasted onto the selected topic."
              : "Select a topic first, then paste an image.",
          );
        } catch (err) {
          showHint(err instanceof Error ? err.message : "Couldn't paste that image.");
        }
      })();
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [enabled, mapRef, showHint]);
}
