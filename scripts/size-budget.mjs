// Bundle-size budget — the single source of truth for the INITIAL-load JS
// ceiling. Fails the gate when the entry chunk's gzipped JS exceeds BUDGET_KB.
// Lazy (code-split) chunks load on demand and are reported but not gated.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// Raise/lower this deliberately (in the same commit as the change that moves it),
// never silently. The entry chunk is the JS that loads on first visit.
// 150 → 153: the search & nav pack adds editor-core code (broadened Find +
// operator/scoped search parser + back/forward navigation history) that can't be
// meaningfully lazy-loaded, nudging the entry from 149.9 to ~152 kB gz.
// 153 → 158: the knowledge-linking / capture / accessibility packs (cross-map +
// in-note links, slash-capture, keyboard + SR a11y) add more editor-core UI that
// likewise can't be lazy-loaded. Headroom for the whole multi-pack effort.
// 158 → 159: typed relationships (B3) + export-this-branch (B4). The branch-export
// picker itself is lazy, but its editor-core orchestration (relationship types in
// the projection / EdgeInspector / rules / filter, the branch-export command +
// context-menu wiring) lands in the entry and can't be lazy-loaded.
// 159 → 160: custom theme designer (C3). The designer UI is lazy, but useTheme must
// resolve a persisted custom theme synchronously on first paint (else the canvas
// flashes the wrong theme), so the store read + luminance-derived cssVar mapping
// (getCustomThemes / customToCanvasTheme) land in the entry and can't be lazy-loaded.
// 160 → 163: the 2026-07-02 Tier 3 batch (MindManager review) — the MenuSub fly-out
// submenu primitive (used by the always-mounted Insert menu + Map panel), the visual
// Layout gallery (layoutPreview.ts + its SVG renderer, replacing a native <select> in
// the always-mounted Map panel), the Design gallery's move from the lazy Canvas menu
// into the always-mounted Map panel, and the AND/NOT rules + full 1-9 priority
// expansions. All of it is core editor-chrome/canvas code the Map panel or canvas
// keydown handler needs synchronously, so none of it can be meaningfully lazy-loaded.
const BUDGET_KB = 163;

const assetsDir = join(import.meta.dirname, "..", "dist", "assets");

let entry = 0;
let lazy = 0;
const rows = [];
for (const name of readdirSync(assetsDir)) {
  if (!name.endsWith(".js")) continue;
  const kb = gzipSync(readFileSync(join(assetsDir, name))).length / 1024;
  const isEntry = /^index-/.test(name); // vite names the entry chunk index-*
  if (isEntry) entry += kb;
  else lazy += kb;
  rows.push(`  ${name}  ${kb.toFixed(1)} kB gz  ${isEntry ? "(entry)" : "(lazy)"}`);
}

for (const row of rows) console.log(row);
console.log(
  `  ───\n  entry  ${entry.toFixed(1)} kB gz  (budget ${BUDGET_KB} kB)    lazy  ${lazy.toFixed(1)} kB gz`,
);

if (entry > BUDGET_KB) {
  console.error(`\n✗ Initial bundle over budget: ${entry.toFixed(1)} kB > ${BUDGET_KB} kB`);
  process.exit(1);
}
console.log(`\n✓ Initial bundle within budget: ${entry.toFixed(1)} kB ≤ ${BUDGET_KB} kB`);

// Critical-CSS guard. React Flow ships its core stylesheet as a SEPARATE file that must be
// imported (src/mindmap/FlowMindMap.tsx -> "@xyflow/react/dist/style.css"). If that import is
// ever dropped the JS still builds, but the canvas renders unstyled — nodes lose their absolute
// positioning and the whole map collapses into inline text (this exact failure shipped once with
// the mind-elixir CSS, undetected). `.react-flow` is a stable, engine-only selector the app never
// authors itself.
const cssText = readdirSync(assetsDir)
  .filter((name) => name.endsWith(".css"))
  .map((name) => readFileSync(join(assetsDir, name), "utf8"))
  .join("\n");
if (!cssText.includes(".react-flow")) {
  console.error(
    '\n✗ React Flow core CSS missing from the bundle — the canvas would render unstyled.\n  Check that `import "@xyflow/react/dist/style.css"` is still in src/mindmap/FlowMindMap.tsx.',
  );
  process.exit(1);
}
console.log("✓ React Flow core CSS bundled (.react-flow rules present)");
