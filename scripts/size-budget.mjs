// Bundle-size budget — the single source of truth for the web bundle ceiling.
// Fails the gate when the gzipped JS in dist/ exceeds BUDGET_KB. Deterministic:
// no network, no measurement flakiness — just gzip the built assets and compare.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

// Raise/lower this deliberately (and in the same commit as the change that moves
// it), never silently. Phase 0 baseline is ~94 kB gz; 150 leaves room for the
// Phase 1 editor without going slack.
const BUDGET_KB = 150;

const assetsDir = join(import.meta.dirname, "..", "dist", "assets");

let total = 0;
const rows = [];
for (const name of readdirSync(assetsDir)) {
  if (!name.endsWith(".js")) continue;
  const kb = gzipSync(readFileSync(join(assetsDir, name))).length / 1024;
  total += kb;
  rows.push(`  ${name}  ${kb.toFixed(1)} kB gz`);
}

for (const row of rows) console.log(row);
console.log(`  ───\n  total  ${total.toFixed(1)} kB gz  (budget ${BUDGET_KB} kB)`);

if (total > BUDGET_KB) {
  console.error(`\n✗ Bundle over budget: ${total.toFixed(1)} kB > ${BUDGET_KB} kB`);
  process.exit(1);
}
console.log(`\n✓ Bundle within budget: ${total.toFixed(1)} kB ≤ ${BUDGET_KB} kB`);
