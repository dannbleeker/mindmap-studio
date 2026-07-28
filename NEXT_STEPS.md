# Next steps — OPEN items only

Shipped work lives in `CHANGELOG.md`. Keep this list to things not yet done.

## Status

MindMap Studio is **feature-complete for its scope** (local-first, offline, single-user, free) and
**live** at <https://mindmap-studio.struktureretsundfornuft.dk/> (GitHub Pages, custom domain,
redeployed on every push to `main`). Canvas engine is **@xyflow/react**.

**Docs coverage:** the user manual covers **100%** of the feature catalogue. `book` coverage is
**editorial by design** — the remaining `book:false` catalogue entries are deliberate exclusions (UI
chrome/affordances that don't belong in a technique-first book; the user guide is the 100% reference),
**not a backlog**.

Every remediation programme is shipped, including the 2026-07-02 MindManager review (all 33 items,
Tiers 1–5). Per-item detail lives in `CHANGELOG.md`. Three of that review's candidates were rejected as
**already shipped** — user-savable map parts, instant task filters, active-filter indicator —
**don't re-propose them**. Anything deliberately **not** built is recorded under *Deferred / blocked*
or *Out of scope*, so the decisions don't get re-litigated. Known-thin areas that are neither open work
nor decided sit in [`docs/KNOWN_ROUGH_EDGES.md`](docs/KNOWN_ROUGH_EDGES.md).

## Localisation (i18n) — the LAYER is done; a long tail of chrome is not

Shipped detail lives in `CHANGELOG.md`. This section keeps the **decisions**, so they don't get
re-litigated, and the open work.

`src/i18n/` holds the registry, the typed English catalogues and the `Intl` plural/collation helpers.
**1214 catalogue entries across five catalogues** — `core` 930 (eager), `canvas` 122, `start` 129,
`present` 17, `theme` 16 (all chunk-local) — reached from **62 files on the guard's allowlist**.
First-load JS is **180.3 kB gz against a 182 ceiling**; note that ceiling measures entry *plus*
modulepreloaded chunks, so it is not comparable to any figure recorded before 2026-07-27 (see the
header of `scripts/bundle-budget.mjs`). English is the only locale and is expected to stay that way —
adding one means adding a JSON catalogue, not changing the app.

> Every number in this section is measured, and each says how. They were all wrong once: this
> paragraph read "684 entries across eight migrated files" and "174.2 kB against a 175 ceiling" for
> sixteen commits after each of those stopped being true — the branch-point values, left in place while
> the work moved on. "Eight migrated files" was also the exact phrasing of the retracted
> completeness claim this section exists to correct. **Re-measure before editing these:**
> `node scripts/i18n-scan.mjs $(git ls-files 'src/**/*.ts' 'src/**/*.tsx') --count | tail -1`,
> and `node scripts/size-budget.mjs` after a build.

**Progress, on branch `i18n/complete-migration` (not merged).** The tree-wide scanner reports **401**,
down from 768 at the branch point — and the two are only loosely comparable, because four more
detectors landed in between; the count rose to 1001 when they did. What it reports breaks down as:

| bucket | strings | status |
| --- | --- | --- |
| declined map CONTENT | 213 | owner decision, recorded — `exampleBuilders` 169, `templates` 30, `sampleMap` 14 |
| catalogue self-hits | 46 | permanent false positive: a catalogue quoting its own English. The five catalogue files must never join the allowlist |
| `src/io/` + `src/import/` | 68 | **not** markup false positives — see below |
| remaining chrome | ~74 | a long tail across ~29 files, none over 6 strings |

**The 68 in `io/` and `import/` were mislabelled here as "mostly XML/SVG markup".** Measured: **one**
of the 68 is markup. 37 are error messages thrown and shown to the user verbatim (`App.tsx:973` renders
`err.message` straight into the error banner), 15 are UI labels compiled into *exported* artifacts —
`interactiveHtml.ts` ships "Expand all", "Collapse all", `aria-label="Filter topics"` into every
interactive HTML export — and the rest are file-picker descriptions, default map titles and
`(untitled)` fallbacks. The rationale was stale: commit `2587348` had already removed the markup class
(`io/pptx`, `io/ooxml`, `io/xml`, `io/html` all scan 0), and this row was written after it. Treat this
bucket as **real user-facing work**, not noise.

**The scanner total is a FLOOR, and a file scanning 0 is not evidence it is migrated.** Run
`pnpm i18n:blindspot` — it walks the TypeScript AST and reports what the line-based detectors cannot
see inside **allowlisted** files. It is deliberately noisy and gates nothing; it is a worklist.

Three blind spots were closed on 2026-07-27 (leading glyph, parentheses, template-literal props) and
paid for — 56 strings. **85 remain**, and the composition is what matters:

| class | roughly | what to do |
| --- | --- | --- |
| a sentence a JSX element or `{…}` cut in half | ~55 | `tNodes` — see `src/i18n/nodes.tsx`. No line-based rule can ever match these |
| plain labels the rules still miss (single lowercase words, fragments) | ~20 | migrate normally |
| legitimately literal | ~10 | physical key names (`Tab`/`Enter`/`Shift`), the copyright line, the search-operator cheatsheet |

### Status 2026-07-28 (updated)

**27+ commits, tree clean, CI green on [PR #173](https://github.com/dannbleeker/mindmap-studio/pull/173)
(draft).** 217 files, 2462 tests, first load 181.8 kB against a 182 ceiling (0.2 kB headroom — the next
eager batch needs the ceiling looked at, see `docs/I18N_BLOCKED.md` item 3).

**Re-measure before believing any number here** — that is the whole lesson of this programme:

```
pnpm i18n:blindspot                                    # what the detectors CANNOT see (allowlisted files)
node scripts/i18n-scan.mjs $(git ls-files 'src/**/*.ts' 'src/**/*.tsx') --count | tail -1
node -e 'import("./scripts/lib/i18nFrozen.mjs").then(m=>{const x=m.frozenByFile("src");console.log([...x.values()].reduce((a,b)=>a+b,0))})'
```
Last measured: scanner **360**, blindspot **8** (4 files — every one legitimately literal: physical key
names, the copyright line, the search-operator cheatsheet), frozen **145** (17 files).

**Done since the branch was last parked:**
- Raw untranslated literals (`MapPanel` layouts, `icons.ts` marker groups, `stickers.ts` categories,
  `priority.ts`) — migrated together with the React keys that read them, so the fix didn't create the
  `Recent.tsx`-shaped bug it was warning against.
- `src/io/` + `src/import/` (~65 strings) — import failures (rendered verbatim in the error banner) and
  chrome baked into exported HTML/decks. Own catalogue (`src/io/messages.ts`); took three attempts to
  place correctly without breaking the size gate (see CHANGELOG for the sideways-movement near-miss).
- `Toolbar.tsx`'s `mindmap-last-export` — was keying "last used" on the rendered label, not an id; five
  more defects found in the same file in the process (two blindspot sentences, six duplicated trigger
  labels). See CHANGELOG.
- **The blindspot residue, 82 → 8.** `tNodes` for the sentences with a real React node embedded; plain
  `t()` + placeholders for the rest. Two new hardcoded-literal shapes found along the way and fixed
  wherever they occurred: a ternary as a bare JSX child (`{cond ? "Word" : other}`, no prop, no tag
  pair — six sites), and `loneJsxTextViolations`' leading-glyph check still using the OLD fixed
  character set `jsxTextViolations` had already moved past. Revived two dead catalogue keys
  (`count.topics`, `count.nodes`, `count.maps`) that existed unreferenced while call sites hand-rolled
  the same plural logic — one of them (`AllMaps.tsx`'s node count) had never pluralised at all before
  this. Found and fixed a second `&amp;`-entity bug, same class as the About panel's. See CHANGELOG.

**Left to do:**

1. **The 145 frozen `t()`** — mechanical getter conversion, deliberately deprioritised: see the note in
   `test/i18n-frozen-ratchet.test.ts` for why emptying that table would not finish the job on its own.
2. **The bundle ceiling has 0.2 kB of headroom.** Every batch since the io/ catalogue has landed within
   budget without raising it, but the margin is now thin enough that the next eager addition should
   re-examine `docs/I18N_BLOCKED.md` item 3 rather than assume there's room.

Owner decisions and their outcomes are in `docs/I18N_BLOCKED.md` (1–3 resolved, 4 partially).

---

**Do not trust that classification without re-checking it** — the first version of this table was wrong
twice, in the same direction, and both were found only by opening the file. `<option value="relates-to">`
was rendering the raw **id** to the user while `EdgeInspector` showed a translated label for the same
five values; and the status bar carried `{n} topic{n === 1 ? "" : "s"}`, a hand-rolled English plural,
which is the exact shape `i18n/registry.ts` names as the reason plural messages exist. Both are fixed.
The lesson generalises: "legitimately literal" is the bucket that hides defects, because it is the one
nobody re-opens.

**The allowlist certifies a file against the detectors, not against reality**, and the `pnpm gate` tick
is worth exactly what the detectors are worth. `test/i18n-pseudo-render.test.tsx` is the only check
that can prove a component clean — it renders under a marked-up catalogue and reports anything that
came back unchanged. It is pointed at four components. Pointing it at `Panels.tsx` and `App.tsx`, which
between them hold 55 of the 93, is the highest-value next step in this whole area.

**Also open:** `parseNaturalDate`'s INPUT grammar ("today", "tomorrow", "+7d", weekday names) is
English-only, and it is genuinely logic rather than translation — a second locale needs its own keyword
table and its own relative-date shapes, not a catalogue entry. Nothing to do until a second locale
exists.

### How to add strings without undoing this

- **Chunk-locality holds.** A lazy feature registers its own catalogue and imports `i18n/registry`,
  never the `i18n` barrel — importing the barrel drags the eager chrome catalogue into that chunk. The
  canvas's 85 entries ride in the `FlowMindMap` chunk and cost the entry bundle nothing.
- **Reuse before minting.** Two keys holding identical English is how a translation drifts; a test in
  `test/i18n.test.ts` fails on it, both within a catalogue and across the two. When collapsing a
  duplicate the survivor must be **eager** — `Panels.tsx` renders without the canvas chunk, so eager
  code pointing at a canvas-registered key throws until that chunk loads. Shared strings go to
  `common.*`. Genuine homonyms go in that test's documented exception list.
- **The guard's green tick is not proof of coverage.** Every detector it has was added *after* a file it
  should have covered was already ticked — 46 hardcoded strings survived in five "migrated" files, then
  51 more after three further detectors. So when you ADD a detector, prove it clean on every file
  already on the allowlist FIRST; if it fires there, those are real misses and fixing them is part of
  the same commit.
- **Two traps that cost real bugs.** A local named `t` **shadows** the imported `t()` — seven existed;
  in that scope `t("…")` is uncallable, so a pass skips those strings silently, and a scripted pass that
  rewrites INTO such a scope compiles and throws at runtime. Renaming the loop variable also strands any
  `{t}` used as content (`tsc` catches that as "not a ReactNode"). And a **catalogue holds characters,
  not HTML entities**: JSX may write `&amp;` and React decodes it, but `t()` returns a plain string
  React renders verbatim, so a scripted extraction that copies JSX source ships `&amp;` to the user.
  Both are pinned by tests.

### Deliberately NOT doing yet: fetching English as a JSON asset

It looks like the scalable answer and it is — later. With one locale it saves nothing: the bytes don't
disappear, they become a second request, and since the UI can't render its own labels until it lands
it's on the critical path regardless. What you'd actually buy is a `t()` callable before messages exist
(precisely the bug that bit this layer on day one), a gate on first paint or a flash of raw keys, and
every consumer having to tolerate "not loaded yet".

Fetching becomes correct at **N locales**, where inline costs N × the catalogue (everyone downloads
every language) and fetched costs one. At two it's a wash; at three or more fetching clearly wins. The
architecture already supports it — `registerMessages()` is per-locale and later registrations overlay
earlier ones, which is exactly the hook a fetched translation needs — so build it in the commit that
adds the second language, where it earns its complexity, not before.

The **PWA manifest cannot follow the locale**: it is baked at build time and read by the OS launcher
before the app runs, and the spec's `translations` member is not broadly implemented. It carries
`lang` + `dir`; the answer at a second language is a per-locale manifest, not a runtime one.

The **OOXML font question is reconned and largely declined.** The empty `<a:ea>`/`<a:cs>` slots are what
Office's own stock theme ships, and both Office apps glyph-fall-back for scripts Calibri lacks, so there
is no verifiable defect — only a possible refinement (the per-script `<a:font script="…">` list) that no
test here could confirm; it needs a real Office render. The genuinely unguarded part was ENCODING, now
pinned by `test/ooxml-non-latin.test.ts`.

### DECLINED (2026-07-26): "make the ~103 locale-unsafe `toLowerCase` sites locale-safe"

**Do not execute this as written — it would open a security hole.** The count was right (105 today) but
the framing was wrong: the great majority of those calls fold a **machine token**, not user text, and
for a machine token locale-sensitive folding is a *defect*, because Turkish folds a dotted capital `I`
to a **dotless `ı`**.

Concretely, and demonstrated rather than argued:

- `io/svgSanitize.ts` folds tag and attribute names to match `FORBIDDEN_TAGS`, which holds `iframe`,
  `script` and `link` — every one containing an `i`. SVG is parsed as `image/svg+xml`, i.e. XML, which
  is case-sensitive, so `<IFRAME>` reaches that check with its case intact. Under Turkish folding it
  becomes `ıframe`, misses the set, and **survives into the exported file**. Mutating the file to
  `toLocaleLowerCase("tr")` fails exactly one test — the new
  *"strips hostile tags whatever their case"* case in `test/svgSanitize.test.ts`, added for this — while
  the other seven still pass. Without that test the regression ships silently.
- `mindmap/flow/keyIntent.ts` compares `e.key.toLowerCase()` to `"z"`, `"c"`, `"d"`, `"l"` — Ctrl+I
  would stop matching.
- `richTextCommands.ts` and `noteFormat.ts` compare `tagName.toLowerCase()`; `"LI"` folds to `"lı"` and
  list handling breaks.
- `i18n/registry.ts` folds the BCP-47 tag before matching a locale — inside the i18n layer itself.

What IS a real question is the smaller subset that folds **user-authored text** for search and matching
(`search.ts`, `filter.ts`, `flow/linkAutocomplete.ts`, the list filters). Even there `toLocaleLowerCase`
is not obviously right: it helps a Turkish user whose query and content agree on which `i` they used,
and hurts them when they don't. With one shipped locale it changes nothing today. If it is ever picked
up, do it as **one `foldForSearch()` seam over that subset only**, and leave every machine-token site
explicitly invariant.

The first eight files migrated — `SettingsDialog`, `shortcuts`, `editorCommands`, `Toolbar`,
`TopicNode`, `FlowMindMap`, `App` and `Panels` — plus the 54 that followed them onto the allowlist,
are **done against the detectors**; don't re-plan them wholesale. That is a weaker claim than the one
this line used to make ("all eight migrated files are done", written when eight was the whole list):
`Panels.tsx` still carries roughly 50 strings the detectors cannot see, so "on the allowlist" means
"clean by the scanner", not "clean". The design once recorded here
for `editorCommands.ts` (drop the label argument and derive the key from the command id inside `add()`)
was **rejected on implementation and should not be revived**: a template-literal key cannot be verified
by `tsc`, and compile-time key checking is the property the typed catalogue exists for. Each call site
passes an explicit key literal instead.

Documented guard limitations, so nobody assumes coverage that isn't there: the positional check needs a
capitalised MULTI-WORD literal, so a single-word label (`"Present"`, `"+ New…"`) still slips through —
widening it would collide with ids and `kind` values. Object properties with prose values are exempt on
purpose (`shortcuts.ts` keeps physical key names literal), which also means a genuinely user-facing
`title:` inside an object literal is invisible.

Correction to the earlier analysis, found on implementation: **"Danish `å` sorts wrong today" was
overstated.** Collation follows the *active* locale, so with English active `Å` correctly collates as
`A`. The default `.sort()` is still wrong for both English and Danish (codepoint order strands å/æ past
z), so `compareText` is a real fix — but Danish's å-after-z order only arrives with a Danish locale.

## Blocked on owner access

- **Manual MindManager open-test of a Studio-exported `.mmap`.** The writer is Studio-faithful but has
  never been opened in real MindManager; the `.mmap`/`.smmx` *importers* are both owner-validated
  (2026-06-19) and guarded by env-gated integration tests (`MMAP_FILE` / `SMMX_FILE`). Awaits Dann's
  next MindManager access. Value rose once the writer began emitting tags, task metadata and embedded
  images, so re-test against that.

## Deferred / blocked (off the active list)

- **Saved *filter* presets stay app-wide in localStorage — decided 2026-07-26, don't re-raise as
  written.** Backlog item 33 asked for saved views *and* filters to move into doc meta; the views half
  shipped, the filter half was declined on recon. `FilterCriteria` is entirely generic (text / markers /
  tags / due / priority / completion / relationship direction + type) with **no map-specific ids**, and
  `filter.ts` documents the presets as "persisted app-wide, reusable across maps". Scoping them to a
  document would *remove* that reuse — a preset saved on one map would stop appearing on the next —
  turning a working feature into a per-map one. The real gap — getting them to a second machine — was
  closed instead by the preferences export/import in Settings (2026-07-26).

- **RTL — deferred (2026-07-25), lower value than it looks and gated on a spike.** ~113 physical
  left/right CSS and inline-style sites in the chrome, 0 logical properties. Scope note that makes it
  cheaper than it first appears: the **39 canvas `flow/*` sites must NOT be mirrored** — a node's
  `side` is persisted *geometry* the user authored, not text direction — and arrow-key semantics need
  only a ~5-line mirror at the `keyIntent.ts` boundary, because `ops.nextSelectionId` is already purely
  topological (left = parent) rather than spatial, with the freeform `nudge` deliberately excluded.
  Unverified risk to spike first: whether `dir="rtl"` on the chrome can be cleanly isolated from the
  React Flow viewport's own transform maths. Note Arabic/Hebrew *content* already renders correctly
  inside nodes via the Unicode bidi algorithm — what's LTR-only is the chrome.
- **AI assist** — **decided against (2026-06-15).** The biggest category-wide gap, but the only fit
  for a no-backend, local-first app is a keyless copy-prompt → paste-result bridge (or BYO-key),
  which isn't worth building. The manual path already exists: paste an outline / Markdown → map.
- **Theme-only `.mmap` styling + summary brackets** — a topic with no explicit colour inherits the
  MindManager `StyleGroup` theme (we don't resolve it), and summary spans are positional/implicit in
  the schema; both are low-ROI, left lossy by design.
- **LaTeX / math** — deferred by decision (heavy KaTeX + ~1 MB offline fonts; not native to MindManager).
- **True simultaneous multi-map / split view** — the multi-doc tab strip already covers tabbed
  switching; side-by-side comparison is a large change (selection/notes/style all assume one active
  `docRef`), deferred unless needed.

## Out of scope (by decision — won't build)

Recorded so the decisions don't get re-litigated (folded in from the retired MindManager gap doc): the
**project-management engine** (Gantt, resources, dependencies, cost, formulas / roll-up dashboards,
topic properties), **real-time collaboration / publishing / enterprise** (co-editing, comments,
access control, cloud/Teams hosting), **capture** (Snap-style web/mobile clippers), and a **separate
native mobile app** (the PWA is responsive — a native app is a different product). Also out by
design (2026-06-16): a **networked / multi-parent graph** — the model is a single-parent, **acyclic
tree**; cross-node links live in the relationship-arrow layer, and a TheBrain-style graph would
re-architect the product (cyclic *connectors* already ship as relationships). A local-first,
no-backend PWA can't and shouldn't chase these.
