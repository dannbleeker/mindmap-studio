import nodeMenu from "@mind-elixir/node-menu";
import "@mind-elixir/node-menu/dist/style.css";
import MindElixir, { type MindElixirInstance } from "mind-elixir";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import type { MindMapDoc } from "../model/types";
import {
  type MeArrow,
  type MeNode,
  fromMindElixir,
  toArrows,
  toMindElixir,
  toSummaries,
} from "./sync";
import { mindManagerTheme } from "./theme";

export interface MindMapHandle {
  exportPng: () => Promise<Blob | null>;
  exportSvg: () => Blob | null;
  focusNode: (id: string) => void;
}

interface MindMapProps {
  doc: MindMapDoc;
  /** Fires after every canvas edit with the updated canonical doc. */
  onChange?: (doc: MindMapDoc) => void;
  ref?: Ref<MindMapHandle>;
}

export function MindMap({ doc, onChange, ref }: MindMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const meRef = useRef<MindElixirInstance | null>(null);
  // The live doc, used to preserve canonical-only fields across edits.
  const docRef = useRef(doc);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
      theme: mindManagerTheme as never,
      draggable: true,
      contextMenu: true,
      toolBar: true,
      keypress: true,
    });
    // Node editor panel (icons / tags / font style / link) — must install before init.
    me.install(nodeMenu);
    me.init({
      nodeData: { ...toMindElixir(doc.root), root: true },
      arrows: toArrows(doc.links),
      summaries: toSummaries(doc),
    } as never);
    meRef.current = me;

    requestAnimationFrame(() => {
      const view = me as unknown as { scaleFit?: () => void; toCenter?: () => void };
      if (view.scaleFit) view.scaleFit();
      else view.toCenter?.();
    });

    // Capture canvas edits back into the canonical model.
    const handleOperation = () => {
      const data = me.getData() as unknown as { nodeData: MeNode; arrows?: MeArrow[] };
      const updated = fromMindElixir(data.nodeData, docRef.current, data.arrows);
      docRef.current = updated;
      onChangeRef.current?.(updated);
    };
    me.bus.addListener("operation", handleOperation);

    if (import.meta.env.DEV) {
      (window as unknown as { __me?: unknown }).__me = me;
    }

    return () => {
      me.bus.removeListener("operation", handleOperation);
      meRef.current = null;
      el.innerHTML = "";
    };
  }, [doc]);

  return <div ref={elRef} style={{ height: "100%", width: "100%" }} />;
}
