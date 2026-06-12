import { useState } from "react";

// Dark-canvas preference, persisted across sessions. Self-contained so App isn't
// cluttered with localStorage plumbing.
const KEY = "mindmap-dark";

export function useDarkMode(): { dark: boolean; toggleDark: () => void } {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        // preference is best-effort
      }
      return next;
    });
  };

  return { dark, toggleDark };
}
