import nodeMenu from "@mind-elixir/node-menu";
import "@mind-elixir/node-menu/dist/style.css";
import MindElixir, { type MindElixirInstance } from "mind-elixir";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import { isDangerousUrl } from "../io/urlSafety";
import type { MapImage, MindMapDoc, NodeStyle } from "../model/types";
import { replaceInTopic } from "../search";
import {
  type MeArrow,
  type MeNode,
  type MeSummary,
  fromMindElixir,
  toArrows,
  toMindElixirRoot,
  toSummaries,
} from "./sync";
import { type MindElixirTheme, mindManagerTheme } from "./theme";

export interface SelectedNode {
  id: string;
  topic: string;
  note: string;
}

export interface MindMapHandle {
  exportPng: () => Promise<Blob | null>;
  exportSvg: () => Blob | null;
  focusNode: (id: string) => void;
  fit: () => void;
  /** Apply an image to the currently-selected node; false if nothing is selected. */
  setSelectedImage: (image: MapImage) => boolean;
  /** Set the note on the currently-selected node; false if nothing is selected. */
  setSelectedNote: (note: string) => boolean;
  /** Toggle a marker icon on the selected node; false if nothing is selected. */
  toggleSelectedIcon: (icon: string) => boolean;
  /** Replace the query in every matching node topic; returns the count changed. */
  replaceTopics: (query: string, replacement: string) => number;
  /** Collapse (false) or expand (true) every branch below the root. */
  setAllExpanded: (expanded: boolean) => void;
  /** Merge a style patch into the selected node ("" / null clears a key); false if none selected. */
  setSelectedStyle: (patch: Partial<NodeStyle>) => boolean;
  /** Set the hyperlink on the selected node ("" clears); false if nothing is selected. */
  setSelectedHyperlink: (url: string) => boolean;
}

/** Prefix marking a node hyperlink as an in-app link to another map. */
export const MAP_LINK_PREFIX = "#map=";

/** Scale + center the map to the viewport (mind-elixir's scaleFit, with a toCenter fallback). */
function fitView(me: MindElixirInstance): void {
  const view = me as unknown as { scaleFit?: () => void; toCenter?: () => void };
  if (view.scaleFit) view.scaleFit();
  else view.toCenter?.();
}

interface MindMapProps {
  doc: MindMapDoc;
  /** Fires after every canvas edit with the updated canonical doc. */
  onChange?: (doc: MindMapDoc) => void;
  /** Fires when the canvas selection changes (for the Notes panel). */
  onSelect?: (selected: SelectedNode | null) => void;
  /** Fires when a node's in-app map link (#map=…) is clicked, with the target map id. */
  onMapLink?: (mapId: string) => void;
  /** Canvas style/theme (light, dark, or a palette); image exports inherit it. */
  theme?: MindElixirTheme;
  /** Layout direction: both sides, right-only, or left-only. */
  direction?: LayoutDirection;
  ref?: Ref<MindMapHandle>;
}

export type LayoutDirection = "side" | "left" | "right";

/** Re-layout the current map to a direction (preserves in-memory edits). */
function applyDirection(me: MindElixirInstance, direction: LayoutDirection): void {
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

  useImperativeHandle(
    ref,
    () => ({
      exportPng: () => meRef.current?.exportPng() ?? Promise.resolve(null),
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

    const me = new MindElixir({
      // SIDE = main branches split left/right of the root (MindManager's look).
      el,
      direction: MindElixir.SIDE,
      theme: themeRef.current as never,
      draggable: true,
      contextMenu: true,
      toolBar: true,
      keypress: true,
    });
    // Node editor panel (icons / tags / font style / link) — must install before init.
    me.install(nodeMenu);
    me.init({
      nodeData: { ...toMindElixirRoot(doc), root: true },
      arrows: toArrows(doc.links),
      summaries: toSummaries(doc),
    } as never);
    meRef.current = me;

    // The constructor lays out as SIDE; apply a non-default direction on (re)init.
    if (directionRef.current !== "side") applyDirection(me, directionRef.current);
    requestAnimationFrame(() => fitView(me));

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
    if (!me) return;
    applyDirection(me, direction);
    fitView(me);
  }, [direction]);

  return <div ref={elRef} style={{ height: "100%", width: "100%" }} />;
}
