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
}

export const EditingContext = createContext<EditingApi | null>(null);

export function useEditing(): EditingApi | null {
  return useContext(EditingContext);
}
