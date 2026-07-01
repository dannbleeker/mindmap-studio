import { useRef, useState } from "react";
import { Button, Input } from "../design/primitives";
import { downloadBlob } from "../io/download";
import type { BranchGrowth } from "../model/types";
import {
  type CustomTheme,
  getCustomThemes,
  newCustomTheme,
  saveCustomThemes,
} from "../store/customThemes";
import { Dialog } from "./Dialog";

// The custom-theme designer (C3). Edit a theme's name / 6-colour branch palette / background / node
// fill / font / branch weight with a live preview, save it (it then appears in the Theme dropdown after
// the built-ins), delete it, or export / import it as a .json. Self-contained + lazy-loaded so its
// storage plumbing stays out of the entry bundle. `onChange` re-reads the theme list (dropdown refresh).

const FONTS: { value: string; label: string }[] = [
  { value: "", label: "Default" },
  { value: "Inter, system-ui, sans-serif", label: "Sans" },
  { value: "Georgia, 'Times New Roman', serif", label: "Serif" },
  { value: "'Courier New', ui-monospace, monospace", label: "Mono" },
];

export function ThemeDesignerDialog({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange: () => void;
}) {
  const [themes, setThemes] = useState<CustomTheme[]>(() => getCustomThemes());
  const [draft, setDraft] = useState<CustomTheme>(() => newCustomTheme("My theme"));
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<CustomTheme>) => setDraft((d) => ({ ...d, ...patch }));
  const setPalette = (i: number, color: string) =>
    setDraft((d) => {
      const palette = [...d.palette];
      palette[i] = color;
      return { ...d, palette };
    });

  const persist = (list: CustomTheme[]) => {
    saveCustomThemes(list);
    setThemes(list);
    onChange();
  };
  const save = () => {
    const clean = { ...draft, name: draft.name.trim() || "My theme" };
    const list = themes.some((t) => t.id === clean.id)
      ? themes.map((t) => (t.id === clean.id ? clean : t))
      : [...themes, clean];
    persist(list);
    setDraft(clean);
  };
  const remove = () => {
    persist(themes.filter((t) => t.id !== draft.id));
    setDraft(newCustomTheme("My theme"));
  };
  const exportJson = () =>
    downloadBlob(
      new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }),
      `${draft.name || "theme"}.json`,
    );
  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<CustomTheme>;
      if (!Array.isArray(parsed.palette)) return;
      // Give the imported theme a fresh id so it doesn't clobber an existing one.
      setDraft({
        ...newCustomTheme(parsed.name ?? "Imported"),
        ...parsed,
        id: newCustomTheme("").id,
      });
    } catch {
      // ignore a non-theme file
    }
  };

  const field = { display: "flex", alignItems: "center", gap: 8, fontSize: 13 } as const;
  const swatch = {
    width: 30,
    height: 26,
    padding: 1,
    border: "1px solid var(--ed-border)",
    borderRadius: 6,
    background: "var(--ed-card)",
    cursor: "pointer",
  } as const;

  return (
    <Dialog
      open
      onClose={onClose}
      title="Theme designer"
      style={{ width: "min(94vw, 540px)", padding: 20, boxShadow: "var(--ed-shadow-pop)" }}
    >
      {themes.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--ed-muted)", marginBottom: 4 }}>Your themes</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {themes.map((t) => (
              <Button
                key={t.id}
                onClick={() => setDraft(t)}
                aria-pressed={t.id === draft.id}
                style={{ borderColor: t.id === draft.id ? "var(--ed-accent)" : undefined }}
              >
                {t.name}
              </Button>
            ))}
            <Button onClick={() => setDraft(newCustomTheme("My theme"))}>＋ New</Button>
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 180px" }}>
        {/* Controls */}
        <div style={{ display: "grid", gap: 8 }}>
          <div style={field}>
            <span style={{ width: 74 }}>Name</span>
            <Input
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              aria-label="Theme name"
              style={{ flex: 1 }}
            />
          </div>
          <div style={field}>
            <span style={{ width: 74 }}>Palette</span>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: 6 }, (_, i) => (
                <input
                  // biome-ignore lint/suspicious/noArrayIndexKey: the six palette slots are positional + fixed.
                  key={i}
                  type="color"
                  value={draft.palette[i] ?? "#888888"}
                  onChange={(e) => setPalette(i, e.target.value)}
                  aria-label={`Branch colour ${i + 1}`}
                  style={swatch}
                />
              ))}
            </div>
          </div>
          <label style={field}>
            <span style={{ width: 74 }}>Background</span>
            <input
              type="color"
              value={draft.background}
              onChange={(e) => set({ background: e.target.value })}
              aria-label="Background colour"
              style={swatch}
            />
          </label>
          <label style={field}>
            <span style={{ width: 74 }}>Node fill</span>
            <input
              type="color"
              value={draft.nodeFill}
              onChange={(e) => set({ nodeFill: e.target.value })}
              aria-label="Node fill colour"
              style={swatch}
            />
          </label>
          <label style={field}>
            <span style={{ width: 74 }}>Font</span>
            <select
              value={draft.fontFamily}
              onChange={(e) => set({ fontFamily: e.target.value })}
              aria-label="Theme font"
              style={{ flex: 1 }}
            >
              {FONTS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label style={field}>
            <span style={{ width: 74 }}>Branch weight</span>
            <select
              value={draft.branchGrowth}
              onChange={(e) => set({ branchGrowth: e.target.value as BranchGrowth })}
              aria-label="Theme branch weight"
              style={{ flex: 1 }}
            >
              <option value="fine">Fine</option>
              <option value="regular">Regular</option>
              <option value="bold">Bold</option>
            </select>
          </label>
        </div>

        {/* Live preview: the background with a root node + branch chips in the palette colours. */}
        <div
          aria-label="Theme preview"
          style={{
            background: draft.background,
            borderRadius: 10,
            border: "1px solid var(--ed-border)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 150,
            fontFamily: draft.fontFamily || undefined,
          }}
        >
          <div
            style={{
              background: draft.nodeFill,
              border: `2px solid ${draft.palette[0] ?? "#888"}`,
              borderRadius: 12,
              padding: "6px 14px",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {draft.name || "Root"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
            {draft.palette.map((c, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: positional palette swatches.
                key={i}
                style={{
                  background: c,
                  color: "#fff",
                  fontSize: 11,
                  borderRadius: 8,
                  padding: "2px 8px",
                }}
              >
                Branch
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Button onClick={save}>Save theme</Button>
        {themes.some((t) => t.id === draft.id) ? (
          <Button onClick={remove} style={{ color: "var(--ed-danger)" }}>
            Delete
          </Button>
        ) : null}
        <span style={{ flex: 1 }} />
        <Button onClick={exportJson}>Download .json</Button>
        <Button onClick={() => fileRef.current?.click()}>Import .json</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void importJson(f);
          }}
          style={{ display: "none" }}
        />
      </div>
    </Dialog>
  );
}
