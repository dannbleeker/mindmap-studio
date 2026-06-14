import nodeMenu from "@mind-elixir/node-menu";
import "@mind-elixir/node-menu/dist/style.css";
import MindElixir, { type MindElixirInstance } from "mind-elixir";
// mind-elixir v5 ships its core stylesheet as a separate file (v4 injected it via JS,
// so the v4->v5 upgrade silently dropped it). Without it the node wrappers lose
// `position:absolute` and the whole map collapses into inline text. A direct CSS import
// so it's always bundled in dev and production.
import "mind-elixir/style.css";
import { useEffect, useImperativeHandle, useRef } from "react";
import { isDangerousUrl } from "../io/urlSafety";
import type { Boundary, MapImage, MindMapDoc, NodeStyle } from "../model/types";
import { replaceInTopic } from "../search";
import { type LayoutKind, MAP_LINK_PREFIX, type MindMapProps, type SelectedNode } from "./contract";
import { type MinimapHandle, createMinimap } from "./minimap";
import {
  type MeArrow,
  type MeNode,
  type MeSummary,
  fromMindElixir,
  setBoundaryLabel,
  toArrows,
  toMindElixirRoot,
  toSummaries,
} from "./sync";
import { mindManagerTheme } from "./theme";

/** Scale + center the map to the viewport (mind-elixir's scaleFit, with a toCenter fallback). */
function fitView(me: MindElixirInstance): void {
  const view = me as unknown as { scaleFit?: () => void; toCenter?: () => void };
  if (view.scaleFit) view.scaleFit();
  else view.toCenter?.();
}

// --- Filled boundary enclosures (MindManager-style) -------------------------
// mind-elixir only draws bracket "summaries"; we hide those on-canvas and draw our own
// rounded, filled box around each boundary's nodes. The overlay lives INSIDE the
// transformed `.map-canvas`, so it pans/zooms with the map for free; it's recomputed
// after layout changes (init / edit / direction). The image export is unaffected (it's
// data-driven via exportSvg, and still carries the bracket).
const OVERLAY_CLASS = "mm-boundary-overlay";
const BOUNDARY_PAD = 16;

let bracketCssInjected = false;
function hideNativeBrackets(): void {
  if (bracketCssInjected || typeof document === "undefined") return;
  bracketCssInjected = true;
  const style = document.createElement("style");
  style.textContent = ".map-canvas .summary { display: none !important; }";
  document.head.appendChild(style);
}

function findNodeEl(me: MindElixirInstance, id: string): HTMLElement | null {
  return (me as unknown as { findEle?: (id: string) => HTMLElement | null }).findEle?.(id) ?? null;
}

function renderBoundaryOverlay(
  el: HTMLElement,
  me: MindElixirInstance,
  boundaries: Boundary[],
  onRelabel?: (id: string, label: string) => void,
): void {
  const canvas = el.querySelector<HTMLElement>(".map-canvas");
  if (!canvas) return;
  canvas.querySelector(`.${OVERLAY_CLASS}`)?.remove();
  if (boundaries.length === 0) return;
  const cRect = canvas.getBoundingClientRect();
  const scale = new DOMMatrixReadOnly(getComputedStyle(canvas).transform).a || 1;
  const overlay = document.createElement("div");
  overlay.className = OVERLAY_CLASS;
  overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;";

  for (const b of boundaries) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    let found = 0;
    for (const id of b.nodeIds) {
      const node = findNodeEl(me, id);
      if (!node) continue;
      const r = node.getBoundingClientRect();
      const x = (r.left - cRect.left) / scale;
      const y = (r.top - cRect.top) / scale;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + r.width / scale);
      maxY = Math.max(maxY, y + r.height / scale);
      found += 1;
    }
    if (found === 0) continue;
    const box = document.createElement("div");
    box.style.cssText = [
      "position:absolute",
      `left:${Math.round(minX - BOUNDARY_PAD)}px`,
      `top:${Math.round(minY - BOUNDARY_PAD)}px`,
      `width:${Math.round(maxX - minX + 2 * BOUNDARY_PAD)}px`,
      `height:${Math.round(maxY - minY + 2 * BOUNDARY_PAD)}px`,
      "box-sizing:border-box",
      "border:1.5px solid #8b87e0",
      "background:rgba(120,116,210,0.10)",
      "border-radius:16px",
    ].join(";");
    const label = b.label && b.label !== "summary" ? b.label : "";
    // Draw the label chip. With an onRelabel handler the chip is interactive (the native
    // bracket — mind-elixir's old double-click-to-label affordance — is hidden), so even an
    // unlabelled boundary shows a muted "Label…" placeholder you can double-click to name.
    if (label || onRelabel) {
      const tag = document.createElement("div");
      tag.textContent = label || "Label…";
      const chip =
        "position:absolute;top:-11px;left:12px;padding:1px 8px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;";
      tag.style.cssText = label
        ? `${chip}background:#eceafb;color:#26215c;border:1px solid #cecbf6;`
        : `${chip}background:#f3f2fb;color:#9a96c4;border:1px dashed #cecbf6;`;
      if (onRelabel) {
        // Re-enable pointer events on just the chip (the overlay itself is click-through).
        tag.style.cssText += "pointer-events:auto;cursor:text;";
        tag.title = "Double-click to rename this boundary";
        const id = b.id;
        tag.addEventListener("dblclick", (event) => {
          event.stopPropagation();
          if (typeof window === "undefined" || !window.prompt) return;
          const next = window.prompt("Boundary label", label);
          if (next !== null) onRelabel(id, next.trim());
        });
      }
      box.appendChild(tag);
    }
    overlay.appendChild(box);
  }
  // First child → painted behind the nodes; the translucent fill keeps them readable.
  canvas.insertBefore(overlay, canvas.firstChild);
}

/** Re-layout the current map to a direction (preserves in-memory edits). */
// mind-elixir only has left/right/side; the React-Flow-only alternate layouts fall back
// to side here (they're a flow-engine feature until cutover).
function applyDirection(me: MindElixirInstance, direction: LayoutKind): void {
  const m = me as unknown as {
    initLeft?: () => void;
    initRight?: () => void;
    initSide?: () => void;
  };
  if (direction === "left") m.initLeft?.();
  else if (direction === "right") m.initRight?.();
  else m.initSide?.();
}

export function MindMap({
  doc,
  onChange,
  onSelect,
  onMapLink,
  theme = mindManagerTheme,
  direction = "side",
  ref,
}: MindMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const meRef = useRef<MindElixirInstance | null>(null);
  const minimapRef = useRef<MinimapHandle | null>(null);
  // The live doc, used to preserve canonical-only fields across edits.
  const docRef = useRef(doc);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onMapLinkRef = useRef(onMapLink);
  onMapLinkRef.current = onMapLink;
  // Track theme via a ref so the init effect reads it without re-initialising
  // (re-init would rebuild from the doc prop and drop unsaved live edits).
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const directionRef = useRef(direction);
  directionRef.current = direction;

  // Rename (or clear) a boundary's label from its on-canvas chip, then persist + redraw.
  // Held in a ref — like onChange/onSelect above — so its stable identity flows into the
  // module-level overlay renderer and the effects below without widening their deps.
  const relabelBoundaryRef = useRef<(id: string, label: string) => void>(() => {});
  relabelBoundaryRef.current = (id: string, label: string): void => {
    const current = docRef.current;
    const boundaries = setBoundaryLabel(current.boundaries ?? [], id, label);
    const updated: MindMapDoc = { ...current, boundaries };
    docRef.current = updated;
    onChangeRef.current?.(updated);
    const host = elRef.current;
    const me = meRef.current;
    if (host && me) renderBoundaryOverlay(host, me, boundaries, relabelBoundaryRef.current);
  };

  useImperativeHandle(
    ref,
    () => ({
      exportSvg: () => meRef.current?.exportSvg() ?? null,
      focusNode: (id: string) => {
        const me = meRef.current;
        if (!me) return;
        try {
          const ele = me.findEle(id);
          if (ele) {
            me.scrollIntoView(ele, true);
            me.selectNode(ele);
          }
        } catch {
          // node not found / not rendered
        }
      },
      fit: () => {
        if (meRef.current) fitView(meRef.current);
      },
      groupBranch: (id: string): boolean => {
        // Select the node, then ask mind-elixir to create a summary over it and its subtree.
        // createSummary fires an "operation" event, so the boundary is captured into the model
        // and persisted like any other edit; our overlay (renderBoundaryOverlay) then draws it
        // as a filled box and the on-box chip is double-click-to-label.
        const me = meRef.current as (MindElixirInstance & { createSummary?: () => void }) | null;
        if (!me?.createSummary) return false;
        try {
          const ele = me.findEle(id);
          if (!ele) return false;
          me.selectNode(ele);
          me.createSummary();
          return true;
        } catch {
          return false;
        }
      },
      setSelectedImage: (image: MapImage): boolean => {
        const me = meRef.current as
          | (MindElixirInstance & {
              currentNode?: unknown;
              reshapeNode?: (el: unknown, patch: unknown) => void;
            })
          | null;
        const el = me?.currentNode;
        if (!me || !el || !me.reshapeNode) return false;
        me.reshapeNode(el, {
          image: { url: image.url, width: image.width ?? 120, height: image.height ?? 120 },
        });
        return true;
      },
      setSelectedNote: (note: string): boolean => {
        const me = meRef.current as
          | (MindElixirInstance & {
              currentNode?: unknown;
              reshapeNode?: (el: unknown, patch: unknown) => void;
            })
          | null;
        const el = me?.currentNode;
        if (!me || !el || !me.reshapeNode) return false;
        me.reshapeNode(el, { note });
        return true;
      },
      toggleSelectedIcon: (icon: string): boolean => {
        const me = meRef.current as
          | (MindElixirInstance & {
              currentNode?: { nodeObj?: { icons?: string[] } };
              reshapeNode?: (el: unknown, patch: unknown) => void;
            })
          | null;
        const el = me?.currentNode;
        if (!me || !el || !me.reshapeNode) return false;
        const current = el.nodeObj?.icons ?? [];
        const next = current.includes(icon)
          ? current.filter((i) => i !== icon)
          : [...current, icon];
        me.reshapeNode(el, { icons: next });
        return true;
      },
      replaceTopics: (query: string, replacement: string): number => {
        const me = meRef.current as
          | (MindElixirInstance & { reshapeNode?: (el: unknown, patch: unknown) => void })
          | null;
        const q = query.trim();
        if (!me || !q || !me.reshapeNode) return 0;
        // Bind so `this` is preserved when we call it outside method position.
        const reshapeNode = me.reshapeNode.bind(me);
        let count = 0;
        const walk = (node: MeNode) => {
          const next = replaceInTopic(node.topic, q, replacement);
          if (next !== node.topic) {
            const el = me.findEle(node.id);
            if (el) {
              reshapeNode(el, { topic: next });
              count += 1;
            }
          }
          for (const child of node.children ?? []) walk(child);
        };
        walk((me.getData() as unknown as { nodeData: MeNode }).nodeData);
        return count;
      },
      setAllExpanded: (expanded: boolean): void => {
        const me = meRef.current as
          | (MindElixirInstance & { refresh?: (data: unknown) => void })
          | null;
        if (!me || !me.refresh) return;
        const data = me.getData() as unknown as { nodeData: MeNode };
        // Keep the root open; collapse/expand every branch beneath it (level-1 overview).
        const walk = (node: MeNode, isRoot: boolean) => {
          if (!isRoot && node.children && node.children.length > 0) node.expanded = expanded;
          for (const child of node.children ?? []) walk(child, false);
        };
        walk(data.nodeData, true);
        me.refresh(data);
        fitView(me);
      },
      setSelectedStyle: (patch: Partial<NodeStyle>): boolean => {
        const me = meRef.current as
          | (MindElixirInstance & {
              currentNode?: { nodeObj?: { style?: NodeStyle } };
              reshapeNode?: (el: unknown, patch: unknown) => void;
            })
          | null;
        const el = me?.currentNode;
        if (!me || !el || !me.reshapeNode) return false;
        // reshapeNode MERGES style (Object.assign), so a cleared key must be set to
        // "" (which clears the inline value) — deleting it would leave the old value.
        const style: Record<string, string> = { ...(el.nodeObj?.style ?? {}) };
        for (const [key, value] of Object.entries(patch)) {
          style[key] = value == null ? "" : value;
        }
        me.reshapeNode(el, { style });
        return true;
      },
      setSelectedHyperlink: (url: string): boolean => {
        const me = meRef.current as
          | (MindElixirInstance & {
              currentNode?: unknown;
              reshapeNode?: (el: unknown, patch: unknown) => void;
            })
          | null;
        const el = me?.currentNode;
        if (!me || !el || !me.reshapeNode) return false;
        // Never store a script-executing scheme (javascript:/data:/vbscript:).
        // The export sanitiser is the real guard; this stops it at the source.
        if (isDangerousUrl(url)) return false;
        me.reshapeNode(el, { hyperLink: url });
        return true;
      },
    }),
    [],
  );

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    docRef.current = doc;
    // Hide the canvas until it's laid out + fit, so the first frame isn't a flash of
    // unpositioned nodes. Revealed in the rAF below; opacity (not display:none) keeps
    // the element measurable so scaleFit can read its size. Managed via the ref rather
    // than the style prop so a React re-render can't reset it back to hidden.
    el.style.opacity = "0";

    const me = new MindElixir({
      // SIDE = main branches split left/right of the root (MindManager's look).
      el,
      direction: MindElixir.SIDE,
      theme: themeRef.current as never,
      draggable: true,
      contextMenu: true,
      toolBar: true,
      keypress: true,
      // Wider zoom range than the default (1.4/0.2) so the minimap's +/- and the wheel
      // can zoom in meaningfully. The engine *blocks* (doesn't clamp) targets past the
      // bound, so the minimap clamps to this same range — keep the two in sync.
      scaleMax: 3,
      scaleMin: 0.2,
    });
    // Node editor panel (icons / tags / font style / link) — must install before init.
    me.install(nodeMenu);
    me.init({
      nodeData: { ...toMindElixirRoot(doc), root: true },
      arrows: toArrows(doc.links),
      summaries: toSummaries(doc),
    } as never);
    meRef.current = me;
    // Corner minimap + integrated zoom controls (hides mind-elixir's own zoom widget).
    minimapRef.current = createMinimap(me, el);

    // The constructor lays out as SIDE; apply a non-default direction on (re)init.
    if (directionRef.current !== "side") applyDirection(me, directionRef.current);
    // Fit on the next frame (mind-elixir finishes layout first), then reveal — so the
    // map appears already laid out and centred, never as an unscaled first frame.
    requestAnimationFrame(() => {
      // Reveal unconditionally — even if fitView throws (e.g. on a torn-down
      // instance during a fast re-init), the canvas must never stay hidden.
      try {
        fitView(me);
      } finally {
        el.style.opacity = "1";
      }
      // Draw filled boundary boxes (and hide mind-elixir's brackets) once laid out.
      hideNativeBrackets();
      renderBoundaryOverlay(el, me, docRef.current.boundaries ?? [], relabelBoundaryRef.current);
      minimapRef.current?.refresh();
    });

    // Capture canvas edits back into the canonical model.
    const handleOperation = () => {
      const data = me.getData() as unknown as {
        nodeData: MeNode;
        arrows?: MeArrow[];
        summaries?: MeSummary[];
      };
      const updated = fromMindElixir(data.nodeData, docRef.current, data.arrows, data.summaries);
      docRef.current = updated;
      onChangeRef.current?.(updated);
      // Re-draw the filled boundary boxes + minimap once the post-edit layout settles.
      requestAnimationFrame(() => {
        renderBoundaryOverlay(el, me, docRef.current.boundaries ?? [], relabelBoundaryRef.current);
        minimapRef.current?.refresh();
      });
    };
    me.bus.addListener("operation", handleOperation);

    // Surface the current selection so App can show a Notes editor for it.
    const readSelected = (): SelectedNode | null => {
      const node = (me as unknown as { currentNode?: { nodeObj?: SelectedNode } }).currentNode
        ?.nodeObj;
      return node ? { id: node.id, topic: node.topic, note: node.note ?? "" } : null;
    };
    const handleSelect = () => onSelectRef.current?.(readSelected());
    const handleUnselect = () => onSelectRef.current?.(null);
    me.bus.addListener("selectNodes", handleSelect);
    me.bus.addListener("unselectNodes", handleUnselect);

    // Intercept clicks on in-app map links (#map=<id>) so they navigate within the
    // app instead of opening a blank tab (mind-elixir renders hyperlinks target=_blank).
    const handleLinkClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a.hyper-link");
      const href = anchor?.getAttribute("href");
      if (href?.startsWith(MAP_LINK_PREFIX)) {
        event.preventDefault();
        event.stopPropagation();
        onMapLinkRef.current?.(href.slice(MAP_LINK_PREFIX.length));
      }
    };
    el.addEventListener("click", handleLinkClick, true);

    // mind-elixir's undo/redo call refresh() WITHOUT firing 'operation', so our
    // model would desync from the canvas (the view reverts but the saved/exported
    // doc wouldn't). Wrap them to re-capture after they revert. This covers both
    // the keyboard (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) and programmatic calls, since
    // mind-elixir's own keydown handler dispatches through me.undo / me.redo.
    const history = me as unknown as { undo: () => void; redo: () => void };
    const originalUndo = history.undo.bind(me);
    const originalRedo = history.redo.bind(me);
    history.undo = () => {
      originalUndo();
      handleOperation();
    };
    history.redo = () => {
      originalRedo();
      handleOperation();
    };

    if (import.meta.env.DEV) {
      (window as unknown as { __me?: unknown }).__me = me;
    }

    return () => {
      me.bus.removeListener("operation", handleOperation);
      me.bus.removeListener("selectNodes", handleSelect);
      me.bus.removeListener("unselectNodes", handleUnselect);
      el.removeEventListener("click", handleLinkClick, true);
      minimapRef.current?.destroy();
      minimapRef.current = null;
      meRef.current = null;
      el.innerHTML = "";
    };
  }, [doc]);

  // Live theme switch without re-initialising (which would drop unsaved edits).
  useEffect(() => {
    const me = meRef.current as
      | (MindElixirInstance & { changeTheme?: (t: unknown) => void })
      | null;
    me?.changeTheme?.(theme as never);
  }, [theme]);

  // Live layout-direction switch (the init effect handles the on-load case).
  const firstDirectionRun = useRef(true);
  useEffect(() => {
    if (firstDirectionRun.current) {
      firstDirectionRun.current = false;
      return;
    }
    const me = meRef.current;
    const el = elRef.current;
    if (!me || !el) return;
    applyDirection(me, direction);
    fitView(me);
    requestAnimationFrame(() => {
      renderBoundaryOverlay(el, me, docRef.current.boundaries ?? [], relabelBoundaryRef.current);
      minimapRef.current?.refresh();
    });
  }, [direction]);

  return <div ref={elRef} style={{ height: "100%", width: "100%" }} />;
}
