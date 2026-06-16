import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { Button } from "../design/primitives";
import { radius, space } from "../design/tokens";

// A controlled wrapper around the native <dialog> element. Driving a real <dialog> via showModal()
// gives us the top-layer backdrop, focus trap, and Escape-to-close for free; this component owns that
// mechanic so call-sites no longer hand-roll a showModal()/close() useEffect each. It's a behaviour-
// preserving extraction of the three identical effects that previously lived in App.tsx.
//
// Controlled: render it always-mounted and flip `open`. The internal effect calls showModal()/close()
// to match, and the native `close` event (fired by Escape, a form `method="dialog"` submit, or our own
// .close()) is wired to `onClose` so React state stays in sync — exactly what the old effects' close
// branches did.

export interface DialogProps {
  /** Whether the modal is shown. The wrapper calls showModal()/close() to match. */
  open: boolean;
  /** Fired when the dialog closes itself (Escape, backdrop, or a close button calling .close()).
   *  Wire this to your `setOpen(false)` so the controlled `open` prop follows the native state. */
  onClose: () => void;
  /** Run once each time the dialog has just been shown (after showModal()). Use for on-open side
   *  effects the old effects did inline — focusing the first field, lazy-loading content, etc. */
  onOpen?: () => void;
  /** Optional convenience header: a bold title + a ✕ close button. Omit it to let `children` own all
   *  of the dialog's content (header included), which keeps a bespoke layout pixel-identical. */
  title?: ReactNode;
  /** Accessible name when there's no visible `title` (mirrors the old `aria-label` on <dialog>). */
  ariaLabel?: string;
  /** Merged last onto the dialog's base style, so callers set their own width / padding / max-width. */
  style?: CSSProperties;
  children: ReactNode;
}

// The shared modal surface — only the bits all three dialogs already had in common: a borderless
// card with the same 12px corner radius. The drop shadow and ink text colour vary per dialog (the
// Paste sheet has neither), so callers pass those through `style` rather than the base imposing them.
const DIALOG_BASE: CSSProperties = {
  border: "none",
  borderRadius: radius.xl,
};

export function Dialog({ open, onClose, onOpen, title, ariaLabel, style, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: fire only on the open/close transition, not when a parent passes a fresh onOpen closure each render (matches the old per-`open` effects).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      onOpen?.();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog ref={ref} aria-label={ariaLabel} onClose={onClose} style={{ ...DIALOG_BASE, ...style }}>
      {title != null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: space.lg,
            marginBottom: space.xl,
          }}
        >
          <strong style={{ fontSize: 15, flex: 1 }}>{title}</strong>
          <Button onClick={onClose} aria-label="Close dialog">
            ✕
          </Button>
        </div>
      )}
      {children}
    </dialog>
  );
}
