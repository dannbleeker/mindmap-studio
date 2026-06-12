import { useState } from "react";
import { type CanvasTheme, themeById } from "./mindmap/theme";

// Canvas style/theme selection, persisted across sessions. Returns the resolved
// theme object plus a setter keyed by theme id.
const KEY = "mindmap-theme";

export function useTheme(): { theme: CanvasTheme; setThemeId: (id: string) => void } {
  const [themeId, setId] = useState(() => {
    try {
      return localStorage.getItem(KEY) ?? "light";
    } catch {
      return "light";
    }
  });

  const setThemeId = (id: string) => {
    setId(id);
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // preference is best-effort
    }
  };

  return { theme: themeById(themeId), setThemeId };
}
