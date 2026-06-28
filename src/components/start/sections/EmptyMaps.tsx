import { blankDoc } from "../docBuilders";
import type { StartContext } from "../types";

// The library empty-state (All maps / Recent when you have no maps). An actionable empty state: a
// primary "New map" button that opens a blank canvas, instead of a dead-end "create one from the
// Start screen" sentence. Reuses the sidebar's `.st-new` primary button styling.
export function EmptyMaps({ ctx }: { ctx: StartContext }) {
  return (
    <div className="st-empty">
      <p style={{ margin: "0 0 14px" }}>No maps yet.</p>
      <button type="button" className="st-new st-empty-new" onClick={() => ctx.onOpen(blankDoc())}>
        <span aria-hidden="true">＋</span> New map
      </button>
    </div>
  );
}
