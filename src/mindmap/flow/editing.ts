import { createContext, useContext } from "react";

// Inline-edit coordination between FlowInner (owner of the doc) and the TopicNode being
// edited. Passed via context so a node can enter edit mode + commit without threading
// callbacks through React Flow's node data.

export interface EditingApi {
  editingId: string | null;
  /** Enter inline edit for a node. */
  beginEdit: (id: string) => void;
  /** Commit the edited text and leave edit mode. */
  commitEdit: (id: string, text: string) => void;
  /** Commit, then add + edit a sibling (Enter) or child (Tab). */
  commitAndAdd: (id: string, text: string, what: "sibling" | "child") => void;
  /** Leave edit mode without saving. */
  cancelEdit: () => void;
  /** Collapse/expand a node from its toggle. */
  toggleCollapse: (id: string) => void;
}

export const EditingContext = createContext<EditingApi | null>(null);

export function useEditing(): EditingApi | null {
  return useContext(EditingContext);
}
