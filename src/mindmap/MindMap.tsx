import MindElixir from "mind-elixir";
import { useEffect, useRef } from "react";
import type { MindMapDoc } from "../model/types";
import { type MeNode, fromMindElixir, toMindElixir } from "./sync";
import { mindManagerTheme } from "./theme";

interface MindMapProps {
  doc: MindMapDoc;
  /** Fires after every canvas edit with the updated canonical doc. */
  onChange?: (doc: MindMapDoc) => void;
}

export function MindMap({ doc, onChange }: MindMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  // The live doc, used to preserve canonical-only fields across edits. Re-seeded
  // whenever a new `doc` is loaded (import / new map).
  const docRef = useRef(doc);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    docRef.current = doc;

    const me = new MindElixir({
      el,
      // SIDE = main branches split left/right of the root (MindManager's look).
      direction: MindElixir.SIDE,
      theme: mindManagerTheme as never,
      draggable: true,
      contextMenu: true,
      toolBar: true,
      keypress: true,
    });
    me.init({ nodeData: { ...toMindElixir(doc.root), root: true } } as never);

    requestAnimationFrame(() => {
      const view = me as unknown as { scaleFit?: () => void; toCenter?: () => void };
      if (view.scaleFit) view.scaleFit();
      else view.toCenter?.();
    });

    // Capture canvas edits back into the canonical model.
    const handleOperation = () => {
      const { nodeData } = me.getData() as unknown as { nodeData: MeNode };
      const updated = fromMindElixir(nodeData, docRef.current);
      docRef.current = updated;
      onChangeRef.current?.(updated);
    };
    me.bus.addListener("operation", handleOperation);

    if (import.meta.env.DEV) {
      (window as unknown as { __me?: unknown }).__me = me;
    }

    return () => {
      me.bus.removeListener("operation", handleOperation);
      el.innerHTML = "";
    };
  }, [doc]);

  return <div ref={elRef} style={{ height: "100%", width: "100%" }} />;
}
