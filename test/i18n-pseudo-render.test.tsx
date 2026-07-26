// @vitest-environment jsdom
//
// Proves the pseudo-locale harness works in BOTH directions, which is the only thing that makes it
// trustworthy as the per-batch check:
//
//   - a MIGRATED component renders nothing but marked text  → the harness can pass
//   - an UNMIGRATED component renders its hardcoded strings  → the harness can fail
//
// A harness that only ever reports zero is worse than none, because it certifies every future batch.
// `Breadcrumb.tsx` is the negative control here on purpose: it is not on the migrated allowlist and
// carries `aria-label="Topic path"` (:15) plus `"(untitled)"`. When Breadcrumb is migrated, this file's
// positive/negative pair must be re-pointed at a still-unmigrated component — see the note on that test.
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkerTagIndex } from "../src/Panels";
import { Breadcrumb } from "../src/components/Breadcrumb";
import type { MapNode } from "../src/model/types";
import {
  applyEchoLocale,
  applyMarkerLocale,
  restoreCatalogues,
  unmarkedStrings,
} from "./helpers/pseudoLocale";

// The overlay is global mutable state — without this the next file to touch i18n inherits it.
afterEach(restoreCatalogues);

// Fixture-supplied user DATA is not a message and must not be reported. Deliberately not English, so a
// real string can never hide behind the ignore list.
const DATA = ["ZZDATA"];

const dataRoot = (): MapNode => ({
  id: "r",
  topic: "ZZDATA",
  children: [{ id: "a", topic: "ZZDATA", icons: ["⭐"], tags: ["ZZDATA"], children: [] }],
});

describe("pseudo-locale harness", () => {
  it("reports nothing for a component whose strings all come from the catalogue", () => {
    // Panels.tsx is on the migrated allowlist, so every string it renders must carry the marker.
    applyMarkerLocale();
    const { container } = render(<MarkerTagIndex root={dataRoot()} onPick={() => {}} />);
    expect(unmarkedStrings(container, DATA)).toEqual([]);
  });

  it("REPORTS the hardcoded strings in a component that has not been migrated", () => {
    // The negative control. If this ever returns [] without Breadcrumb having been migrated, the
    // harness has gone blind and every batch it certified needs re-checking.
    applyMarkerLocale();
    const { container } = render(
      <Breadcrumb crumbs={[{ id: "a", topic: "ZZDATA" }]} onPick={() => {}} />,
    );
    const found = unmarkedStrings(container, DATA);
    expect(found.length).toBeGreaterThan(0);
    expect(found.join("\n")).toContain("Topic path");
  });

  it("echo mode names the KEY a call site read, not just that it read one", () => {
    // Marker mode proves a string came from the catalogue. Only echo mode proves it came from the
    // RIGHT entry — the failure mode where a migration mints a plausible new key instead of reusing
    // the existing one, which renders identically and passes every other check.
    applyEchoLocale();
    const { container } = render(<MarkerTagIndex root={dataRoot()} onPick={() => {}} />);
    expect(container.innerHTML).toContain("panel.markersTags");
  });
});
