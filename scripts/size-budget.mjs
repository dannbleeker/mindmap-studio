// Bundle-size budget — the single source of truth for the INITIAL-load JS
// ceiling. Fails the gate when the entry chunk's gzipped JS exceeds BUDGET_KB.
// Lazy (code-split) chunks load on demand and are reported but not gated.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// Raise/lower this deliberately (in the same commit as the change that moves it),
// never silently. The entry chunk is the JS that loads on first visit.
const BUDGET_KB = 150;

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
