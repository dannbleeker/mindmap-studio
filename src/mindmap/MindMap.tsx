import nodeMenu from "@mind-elixir/node-menu";
import "@mind-elixir/node-menu/dist/style.css";
import MindElixir, { type MindElixirInstance } from "mind-elixir";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import type { MapImage, MindMapDoc } from "../model/types";
import {
  type MeArrow,
  type MeNode,
  type MeSummary,
  fromMindElixir,
  toArrows,
  toMindElixirRoot,
  toSummaries,
} from "./sync";
import { mindManagerDarkTheme, mindManagerTheme } from "./theme";

export interface MindMapHandle {
  exportPng: () => Promise<Blob | null>;
  exportSvg: () => Blob | null;
  focusNode: (id: string) => void;
  fit: () => void;
  /** Apply an image to the currently-selected node; false if nothing is selected. */
  setSelectedImage: (image: MapImage) => boolean;
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
  /** Dark canvas theme (presentation / screen use); exports inherit it. */
  dark?: boolean;
  ref?: Ref<MindMapHandle>;
}

export function MindMap({ doc, onChange, dark = false, ref }: MindMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const meRef = useRef<MindElixirInstance | null>(null);
  // The live doc, used to preserve canonical-only fields across edits.
  const docRef = useRef(doc);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Track dark via a ref so the init effect reads it without re-initialising
  // (re-init would rebuild from the doc prop and drop unsaved live edits).
  const darkRef = useRef(dark);
  darkRef.current = dark;

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
      theme: (darkRef.current ? mindManagerDarkTheme : mindManagerTheme) as never,
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
      meRef.current = null;
      el.innerHTML = "";
    };
  }, [doc]);

  // Live theme switch without re-initialising (which would drop unsaved edits).
  useEffect(() => {
    const me = meRef.current as
      | (MindElixirInstance & { changeTheme?: (t: unknown) => void })
      | null;
    me?.changeTheme?.((dark ? mindManagerDarkTheme : mindManagerTheme) as never);
  }, [dark]);

  return <div ref={elRef} style={{ height: "100%", width: "100%" }} />;
}
