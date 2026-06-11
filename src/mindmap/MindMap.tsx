import MindElixir from "mind-elixir";
import { useEffect, useRef } from "react";
import type { MapNode, MindMapDoc } from "../model/types";
import { mindManagerTheme } from "./theme";

// Map our canonical node -> mind-elixir's node shape. Keeping this adapter thin
// (and one-directional here) is what stops us getting locked into mind-elixir:
// the canonical model stays authoritative.
function toMindElixir(node: MapNode): Record<string, unknown> {
  return {
    id: node.id,
    topic: node.topic,
    ...(node.style ? { style: node.style } : {}),
    ...(node.tags ? { tags: node.tags } : {}),
    ...(node.icons ? { icons: node.icons } : {}),
    ...(node.hyperlink ? { hyperLink: node.hyperlink } : {}),
    expanded: !node.collapsed,
    children: node.children.map(toMindElixir),
  };
}

export function MindMap({ doc }: { doc: MindMapDoc }) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const me = new MindElixir({
      el,
      // SIDE = main branches split left and right of the root: the classic
      // two-sided radial map MindManager opens with.
      direction: MindElixir.SIDE,
      theme: mindManagerTheme as never,
      draggable: true,
      contextMenu: true,
      toolBar: true,
      keypress: true,
    });

    me.init({ nodeData: { ...toMindElixir(doc.root), root: true } } as never);

    // Fit the whole tree into the viewport so sub-topics are visible at a glance.
    requestAnimationFrame(() => {
      const view = me as unknown as { scaleFit?: () => void; toCenter?: () => void };
      if (view.scaleFit) view.scaleFit();
      else view.toCenter?.();
    });

    return () => {
      el.innerHTML = "";
    };
  }, [doc]);

  return <div ref={elRef} style={{ height: "100%", width: "100%" }} />;
}
