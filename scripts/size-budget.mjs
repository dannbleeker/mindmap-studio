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
const BUDGET_KB = 153;

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
