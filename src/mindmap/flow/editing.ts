import { createContext, useContext } from "react";

// Inline-edit coordination between FlowInner (owner of the doc) and the TopicNode being
// edited. Passed via context so a node can enter edit mode + commit without threading
// callbacks through React Flow's node data.

export interface EditingApi {
  editingId: string | null;
  /** Enter inline edit for a node. */
  beginEdit: (id: string) => void;
  /** Commit the edited topic (raw contenteditable HTML) and leave edit mode. */
  commitEdit: (id: string, html: string) => void;
  /** Commit, then add + edit a sibling (Enter) or child (Tab). `html` is the raw editor HTML. */
  commitAndAdd: (id: string, html: string, what: "sibling" | "child") => void;
  /** Leave edit mode without saving. */
  cancelEdit: () => void;
  /** Collapse/expand a node from its toggle. */
  toggleCollapse: (id: string) => void;
  /** Follow a node's hyperlink: jump to a topic (#node=), open a map (#map=), or open a URL. */
  openLink: (url: string) => void;
  /** Advance a node's task completion one quarter-step (clicking its on-canvas pie), looping at 100%. */
  cycleProgress: (id: string) => void;
  /** Select the node and open the inspector on its Notes tab (clicking the node's 📝 indicator). */
  openNote: (id: string) => void;
}

export const EditingContext = createContext<EditingApi | null>(null);

export function useEditing(): EditingApi | null {
  return useContext(EditingContext);
}
