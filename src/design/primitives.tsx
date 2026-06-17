import type { ButtonHTMLAttributes, CSSProperties, ReactNode, Ref } from "react";
import { colors, fontSize, fontWeight, radius, space } from "./tokens";

// Reusable chrome primitives, built from the design tokens. Each one's *default* rendered output is
// pixel-identical to the inline styles it replaces (src/ui.ts, src/Panels.tsx) — this is an
// extraction, not a restyle. Every primitive accepts `style` (merged last, so callers can extend or
// override) and forwards the rest of its native props, so existing call-sites keep their titles,
// aria-*, onClick, etc.

/** The base "control" look — the toolbar button / pill (was `controlStyle` in ui.ts). Exported so
 *  ui.ts can re-export it for the App toolbar, which still consumes the raw style object. */
export const controlStyle = {
  fontSize: fontSize.md,
  fontWeight: fontWeight.semibold,
  color: colors.text,
  border: `1px solid ${colors.controlBorder}`,
  background: colors.controlBg,
  borderRadius: radius.lg,
  padding: `${space.md}px ${space.xl}px`,
  cursor: "pointer",
  // Keep size in the mobile single-row toolbar so it scrolls horizontally instead of squishing
  // (no-op on the desktop wrapping toolbar, where controls keep their size anyway).
  flexShrink: 0,
} as const satisfies CSSProperties;

/** The base text-input look (was `inputStyle` in ui.ts). White surface, control border. */
export const inputStyle = {
  fontSize: fontSize.md,
  color: colors.text,
  border: `1px solid ${colors.controlBorder}`,
  background: colors.white,
  borderRadius: radius.lg,
  padding: `${space.md}px ${space.xl}px`,
  width: 130,
  flexShrink: 0,
} as const satisfies CSSProperties;

// The active control look: a solid accent-on-white-text swatch. Several callers (progress steps,
// priority, history) override the colours per-control, but the default lit state is the deep-ink
// fill the toolbar/info panel uses for a pressed control.
const ACTIVE_CONTROL: CSSProperties = {
  background: colors.text,
  color: colors.white,
  borderColor: colors.text,
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** When true, renders the pressed look and sets `aria-pressed` (a toggle button). */
  active?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

/** A control button with the toolbar look. `active` gives the pressed/aria-pressed variant; the
 *  native `disabled` attribute is forwarded (callers already rely on the browser default styling).
 *  `type` defaults to "button" so these never submit a form. */
export function Button({ active, style, type, className, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      aria-pressed={active ? true : rest["aria-pressed"]}
      className={className ? `mm-prim-btn ${className}` : "mm-prim-btn"}
      style={{ ...controlStyle, ...(active ? ACTIVE_CONTROL : null), ...style }}
      {...rest}
    />
  );
}

/** A text input with the chrome look. Forwards all native input props (value/onChange/placeholder/
 *  aria-label/type/defaultValue/onKeyDown/onBlur…). */
export function Input({
  style,
  ref,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      className={className ? `mm-prim-input ${className}` : "mm-prim-input"}
      style={{ ...inputStyle, ...style }}
      {...rest}
    />
  );
}

/** A select with the same control look as Input (the panels render selects at input width). */
export function Select({
  style,
  children,
  ref,
  className,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <select
      ref={ref}
      className={className ? `mm-prim-select ${className}` : "mm-prim-select"}
      style={{ ...inputStyle, ...style }}
      {...rest}
    >
      {children}
    </select>
  );
}

// The toggle-chip look used by the Filter panel marker/tag chips: a rounded outline that fills with
// the accent when selected. (Distinct from src/Chip.tsx, which is a tiny read-only badge on nodes.)
const CHIP_BASE: CSSProperties = {
  borderRadius: radius.md,
  cursor: "pointer",
  fontSize: fontSize.md,
  lineHeight: 1.4,
  padding: `${space.xxs}px ${space.md + 1}px`,
};

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
  /** Lit (selected) state — solid accent fill, sets aria-pressed. */
  selected?: boolean;
};

/** A selectable toggle chip (Filter panel). Selected = accent fill + white text + accent border;
 *  unselected = white fill, control border, ink text. */
export function Chip({ selected, style, type, className, children, ...rest }: ChipProps) {
  return (
    <button
      type={type ?? "button"}
      aria-pressed={selected}
      className={className ? `mm-prim-chip ${className}` : "mm-prim-chip"}
      style={{
        ...CHIP_BASE,
        border: `1px solid ${selected ? colors.accent : colors.controlBorder}`,
        background: selected ? colors.accent : colors.white,
        color: selected ? colors.white : colors.text,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** The left-rail panel shell — a fixed-width flex column with a right divider (was `PANEL_ASIDE`).
 *  Pass `width` to override the default 250 (the Info panel uses 280); `style` merges last. */
export function Panel({
  children,
  width = 250,
  style,
}: {
  children: ReactNode;
  width?: number;
  style?: CSSProperties;
}) {
  return (
    <aside
      style={{
        width,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${colors.border}`,
        background: colors.surface,
        ...style,
      }}
    >
      {children}
    </aside>
  );
}

/** A small-caps section header inside a panel (was `PANEL_GROUP_LABEL`). Used on its own as a label
 *  before a block of controls. */
export function PanelSection({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="mm-prim-section"
      style={{
        padding: `${space.lg}px ${space.xl}px ${space.xxs}px`,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        color: colors.faint,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// A segmented tab strip — the start screen's `.st-tabs` pattern (CaptureCard) ported to the panel
// palette so the Info panel can group its sections into tabs. The container is a faint inset pill;
// the active tab gets a raised white card. Each button is role="tab"/aria-selected (matching the
// start-screen idiom); state lives in the caller.
const TABLIST_BASE: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: 3,
  margin: `${space.md}px ${space.xl}px ${space.xs}px`,
  background: colors.surfaceBar,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.lg,
  flexShrink: 0,
};
const TAB_BASE: CSSProperties = {
  flex: 1,
  border: "none",
  background: "transparent",
  color: colors.muted,
  font: "inherit",
  fontWeight: fontWeight.semibold,
  fontSize: fontSize.sm,
  padding: `${space.md}px ${space.lg}px`,
  borderRadius: radius.md,
  cursor: "pointer",
};
const TAB_SELECTED: CSSProperties = {
  background: colors.white,
  color: colors.text,
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
};

export interface TabItem {
  id: string;
  label: ReactNode;
  /** Optional tooltip / accessible hint for the tab button. */
  title?: string;
}

/** A segmented tab strip. `active` is the selected tab id; `onChange` fires with the clicked id.
 *  The caller renders the matching tab body itself (this is just the selector). */
export function Tabs({
  tabs,
  active,
  onChange,
  ariaLabel,
  style,
}: {
  tabs: readonly TabItem[];
  active: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="mm-prim-tablist"
      role="tablist"
      aria-label={ariaLabel}
      style={{ ...TABLIST_BASE, ...style }}
    >
      {tabs.map((t) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            title={t.title}
            onClick={() => onChange(t.id)}
            className="mm-prim-tab"
            style={{ ...TAB_BASE, ...(selected ? TAB_SELECTED : null) }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
