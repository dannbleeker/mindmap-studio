import type { MindElixirInstance } from "mind-elixir";

// --- Corner minimap + integrated zoom controls ------------------------------
// mind-elixir has no built-in minimap (verified: none in dist, `@mind-elixir/minimap`
// is 404). We draw a schematic overview — one small rect per topic — into a fixed-size
// corner panel, plus a draggable viewport rectangle that pans the main canvas. Zoom
// buttons drive `me.scale`/`scaleFit`; mind-elixir's own bottom-right zoom widget is
// hidden so there's a single, integrated control. Pan/zoom are reflected live via the
// engine's "move"/"scale" bus events; the schematic is redrawn on data edits (refresh()).

export interface MmRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MinimapLayout {
  /** Scale factor from canvas-local px → minimap px. */
  scale: number;
  offsetX: number;
  offsetY: number;
  contentMinX: number;
  contentMinY: number;
  /** Node rects projected into minimap px. */
  nodes: MmRect[];
  /** The visible viewport projected into minimap px (caller clamps to the box). */
  viewport: MmRect;
}

/**
 * Project canvas-local node rects + the visible viewport into a fixed WxH minimap box.
 * Bounds come from the nodes only, so the schematic stays put while panning; the viewport
 * is projected with the same transform and clamped by the caller. Pure — unit-tested.
 */
export function computeMinimapLayout(
  nodeRects: MmRect[],
  viewport: MmRect,
  mapW: number,
  mapH: number,
  pad = 8,
): MinimapLayout | null {
  if (nodeRects.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const r of nodeRects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  const contentW = Math.max(1, maxX - minX);
  const contentH = Math.max(1, maxY - minY);
  const scale = Math.min((mapW - 2 * pad) / contentW, (mapH - 2 * pad) / contentH);
  const offsetX = (mapW - contentW * scale) / 2;
  const offsetY = (mapH - contentH * scale) / 2;
  const project = (r: MmRect): MmRect => ({
    x: offsetX + (r.x - minX) * scale,
    y: offsetY + (r.y - minY) * scale,
    w: r.w * scale,
    h: r.h * scale,
  });
  return {
    scale,
    offsetX,
    offsetY,
    contentMinX: minX,
    contentMinY: minY,
    nodes: nodeRects.map(project),
    viewport: project(viewport),
  };
}

/** Inverse of the layout projection: a point on the minimap → canvas-local coords. */
export function minimapPointToCanvas(
  mx: number,
  my: number,
  layout: Pick<MinimapLayout, "scale" | "offsetX" | "offsetY" | "contentMinX" | "contentMinY">,
): { x: number; y: number } {
  return {
    x: (mx - layout.offsetX) / layout.scale + layout.contentMinX,
    y: (my - layout.offsetY) / layout.scale + layout.contentMinY,
  };
}

export interface MinimapHandle {
  /** Redraw the schematic (call after data edits / init / direction change). */
  refresh: () => void;
  destroy: () => void;
}

const PANEL_CLASS = "mm-minimap";
const MAP_W = 200;
const MAP_H = 130;
const ZOOM_STEP = 1.2;
// Keep in sync with the MindElixir scaleMin/scaleMax options in MindMap.tsx: the engine
// *blocks* a target past its bound rather than clamping, so a step that overshoots would
// be a no-op — we clamp here so the last step lands exactly on the limit.
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 3;
const clampZoom = (v: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v));

let builtinZoomHidden = false;
function hideBuiltinZoom(doc: Document): void {
  if (builtinZoomHidden) return;
  builtinZoomHidden = true;
  const style = doc.createElement("style");
  // mind-elixir's own bottom-right zoom toolbar — replaced by this panel's controls.
  style.textContent = ".mind-elixir-toolbar.rb { display: none !important; }";
  doc.head.appendChild(style);
}

/**
 * A visible swatch colour for a node rect. Topic pills are mostly cream/transparent, so
 * `backgroundColor` alone would be invisible on the minimap — prefer a distinctive opaque
 * fill (e.g. the dark root), else the branch/border colour (main branches), else the text
 * colour (leaves).
 */
function nodeSwatch(el: Element): string {
  const cs = getComputedStyle(el);
  const bg = cs.backgroundColor;
  const m = bg.match(/^rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(",").map((s) => Number.parseFloat(s));
    const alpha = p.length > 3 ? p[3] : 1;
    const nearWhite = p[0] > 230 && p[1] > 230 && p[2] > 230;
    if (alpha > 0.1 && !nearWhite) return bg;
  }
  return cs.borderTopColor || cs.color || "#8b87e0";
}

interface MeBus {
  bus: {
    addListener: (event: string, fn: (...args: unknown[]) => void) => void;
    removeListener: (event: string, fn: (...args: unknown[]) => void) => void;
  };
}

/** Build the minimap + zoom panel and wire it to the live engine. */
export function createMinimap(me: MindElixirInstance, host: HTMLElement): MinimapHandle {
  const doc = host.ownerDocument;
  hideBuiltinZoom(doc);

  const panel = doc.createElement("div");
  panel.className = PANEL_CLASS;
  panel.style.cssText =
    "position:absolute;right:16px;bottom:16px;z-index:5;display:flex;flex-direction:column;gap:6px;" +
    "padding:8px;border-radius:10px;background:var(--panel-bgcolor,#fff);color:var(--panel-color,#333);" +
    "box-shadow:0 2px 10px #0003;user-select:none;font:12px system-ui,sans-serif;";

  const canvasEl = doc.createElement("div");
  canvasEl.style.cssText = `position:relative;width:${MAP_W}px;height:${MAP_H}px;overflow:hidden;border-radius:6px;background:var(--bgcolor,#f6f6f8);cursor:pointer;`;

  const viewportEl = doc.createElement("div");
  viewportEl.style.cssText =
    "position:absolute;border:1.5px solid #4f7cff;background:rgba(79,124,255,0.14);border-radius:3px;pointer-events:none;";
  canvasEl.appendChild(viewportEl);

  const row = doc.createElement("div");
  row.style.cssText = "display:flex;align-items:center;gap:4px;justify-content:space-between;";
  const mkBtn = (text: string, title: string): HTMLButtonElement => {
    const b = doc.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.title = title;
    b.style.cssText =
      "border:1px solid var(--panel-color,#cfcfe0);background:transparent;color:inherit;border-radius:5px;" +
      "width:26px;height:22px;line-height:1;cursor:pointer;font-size:14px;padding:0;";
    return b;
  };
  const outBtn = mkBtn("−", "Zoom out");
  const inBtn = mkBtn("+", "Zoom in");
  const fitBtn = mkBtn("⤢", "Fit map to view");
  const label = doc.createElement("span");
  label.style.cssText = "min-width:40px;text-align:center;font-variant-numeric:tabular-nums;";
  row.append(outBtn, label, inBtn, fitBtn);

  panel.append(canvasEl, row);
  host.appendChild(panel);

  let layout: MinimapLayout | null = null;
  const nodePool: HTMLElement[] = [];

  const currentView = (scale: number, mapRect: DOMRect): MmRect => {
    const c = me.container.getBoundingClientRect();
    return {
      x: (c.left - mapRect.left) / scale,
      y: (c.top - mapRect.top) / scale,
      w: c.width / scale,
      h: c.height / scale,
    };
  };

  const updateViewport = (): void => {
    const scale = me.scaleVal || 1;
    label.textContent = `${Math.round(scale * 100)}%`;
    if (!layout) return;
    const mapRect = me.map.getBoundingClientRect();
    const view = currentView(scale, mapRect);
    const vx = layout.offsetX + (view.x - layout.contentMinX) * layout.scale;
    const vy = layout.offsetY + (view.y - layout.contentMinY) * layout.scale;
    const left = Math.max(0, vx);
    const top = Math.max(0, vy);
    const right = Math.min(MAP_W, vx + view.w * layout.scale);
    const bottom = Math.min(MAP_H, vy + view.h * layout.scale);
    viewportEl.style.left = `${left}px`;
    viewportEl.style.top = `${top}px`;
    viewportEl.style.width = `${Math.max(0, right - left)}px`;
    viewportEl.style.height = `${Math.max(0, bottom - top)}px`;
  };

  const redraw = (): void => {
    const scale = me.scaleVal || 1;
    const mapRect = me.map.getBoundingClientRect();
    const rects: MmRect[] = [];
    const colors: string[] = [];
    for (const el of Array.from(me.map.querySelectorAll("me-tpc"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      rects.push({
        x: (r.left - mapRect.left) / scale,
        y: (r.top - mapRect.top) / scale,
        w: r.width / scale,
        h: r.height / scale,
      });
      colors.push(nodeSwatch(el));
    }
    layout = computeMinimapLayout(rects, currentView(scale, mapRect), MAP_W, MAP_H);
    if (layout) {
      for (let i = 0; i < layout.nodes.length; i++) {
        let n = nodePool[i];
        if (!n) {
          n = doc.createElement("div");
          n.style.position = "absolute";
          n.style.borderRadius = "2px";
          canvasEl.insertBefore(n, viewportEl);
          nodePool[i] = n;
        }
        const nr = layout.nodes[i];
        n.style.left = `${nr.x}px`;
        n.style.top = `${nr.y}px`;
        n.style.width = `${Math.max(2, nr.w)}px`;
        n.style.height = `${Math.max(2, nr.h)}px`;
        n.style.background = colors[i];
        n.style.display = "";
      }
      for (let i = layout.nodes.length; i < nodePool.length; i++) {
        nodePool[i].style.display = "none";
      }
    }
    updateViewport();
  };

  // Drag/click on the minimap re-centres the main view on that point.
  const panTo = (clientX: number, clientY: number): void => {
    if (!layout) return;
    const box = canvasEl.getBoundingClientRect();
    const target = minimapPointToCanvas(clientX - box.left, clientY - box.top, layout);
    const scale = me.scaleVal || 1;
    const view = currentView(scale, me.map.getBoundingClientRect());
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;
    me.move((cx - target.x) * scale, (cy - target.y) * scale);
  };

  let dragging = false;
  const onDown = (e: MouseEvent): void => {
    dragging = true;
    panTo(e.clientX, e.clientY);
    e.preventDefault();
  };
  const onMove = (e: MouseEvent): void => {
    if (dragging) panTo(e.clientX, e.clientY);
  };
  const onUp = (): void => {
    dragging = false;
  };
  canvasEl.addEventListener("mousedown", onDown);
  doc.addEventListener("mousemove", onMove);
  doc.addEventListener("mouseup", onUp);

  outBtn.addEventListener("click", () => me.scale(clampZoom((me.scaleVal || 1) / ZOOM_STEP)));
  inBtn.addEventListener("click", () => me.scale(clampZoom((me.scaleVal || 1) * ZOOM_STEP)));
  fitBtn.addEventListener("click", () => me.scaleFit());

  // Reflect pan/zoom live — the engine fires "move"/"scale" synchronously on each step.
  // updateViewport is cheap (a couple of rect reads + one rect's styles), so we run it
  // inline rather than via rAF (which a backgrounded tab would pause).
  const bus = (me as unknown as MeBus).bus;
  const onTransform = (): void => updateViewport();
  bus.addListener("move", onTransform);
  bus.addListener("scale", onTransform);

  const destroy = (): void => {
    bus.removeListener("move", onTransform);
    bus.removeListener("scale", onTransform);
    canvasEl.removeEventListener("mousedown", onDown);
    doc.removeEventListener("mousemove", onMove);
    doc.removeEventListener("mouseup", onUp);
    panel.remove();
  };

  redraw();
  return { refresh: redraw, destroy };
}
