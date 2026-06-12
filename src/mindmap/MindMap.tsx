import nodeMenu from "@mind-elixir/node-menu";
import "@mind-elixir/node-menu/dist/style.css";
import MindElixir, { type MindElixirInstance } from "mind-elixir";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import type { MapImage, MindMapDoc } from "../model/types";
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
}

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
