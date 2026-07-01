import { describe, expect, it } from "vitest";
import {
  type LinkCandidate,
  applyLinkSelection,
  linkTriggerAt,
  matchLinkCandidates,
} from "../src/mindmap/flow/linkAutocomplete";

describe("linkTriggerAt", () => {
  it("detects a wiki `[[` token up to the caret", () => {
    const t = linkTriggerAt("see [[Intro", 11);
    expect(t).toEqual({ kind: "wiki", query: "Intro", start: 4, end: 11 });
  });

  it("wiki query may contain spaces (topic names) but not a closing ]] ", () => {
    expect(linkTriggerAt("[[my topic", 10)?.query).toBe("my topic");
    expect(linkTriggerAt("[[done]] and more", 17)).toBeNull(); // already closed
  });

  it("detects an `@` mention at a word boundary", () => {
    expect(linkTriggerAt("cc @road", 8)).toEqual({
      kind: "mention",
      query: "road",
      start: 3,
      end: 8,
    });
    expect(linkTriggerAt("@road", 5)?.kind).toBe("mention"); // at line start
  });

  it("ignores an `@` that isn't at a word boundary (e.g. an email)", () => {
    expect(linkTriggerAt("me@example", 10)).toBeNull();
  });

  it("returns null when the caret isn't inside any trigger", () => {
    expect(linkTriggerAt("plain topic", 11)).toBeNull();
    expect(linkTriggerAt("", 0)).toBeNull();
  });

  it("prefers the token nearest the caret when both are present", () => {
    // "[[a @b" — the @ starts later (nearer the caret), so the mention wins.
    expect(linkTriggerAt("[[a @b", 6)?.kind).toBe("mention");
    // "@a [[b" — the [[ starts later, so the wiki wins.
    expect(linkTriggerAt("@a [[b", 6)?.kind).toBe("wiki");
  });
});

describe("applyLinkSelection", () => {
  it("replaces the trigger token with the label and returns the new caret", () => {
    const trigger = linkTriggerAt("see [[Intro", 11);
    if (!trigger) throw new Error("expected a trigger");
    expect(applyLinkSelection("see [[Intro", trigger, "Introduction")).toEqual({
      text: "see Introduction",
      caret: 16,
    });
  });

  it("keeps text after the caret intact", () => {
    const text = "a @b done";
    const trigger = linkTriggerAt("a @b", 4); // caret right after "b"
    if (!trigger) throw new Error("expected a trigger");
    expect(applyLinkSelection(text, trigger, "Beta")).toEqual({ text: "a Beta done", caret: 6 });
  });
});

describe("matchLinkCandidates", () => {
  const cands: LinkCandidate[] = [
    { id: "n1", label: "Introduction", link: "#node=n1", kind: "node" },
    { id: "n2", label: "Interlude", link: "#node=n2", kind: "node" },
    { id: "m1", label: "Roadmap", link: "#map=m1", kind: "map" },
  ];

  it("filters case-insensitively by label", () => {
    expect(matchLinkCandidates(cands, "intro").map((c) => c.id)).toEqual(["n1"]);
    expect(matchLinkCandidates(cands, "IN").map((c) => c.id)).toEqual(["n1", "n2"]);
  });

  it("lists all (capped) for an empty query and [] for no match", () => {
    expect(matchLinkCandidates(cands, "").map((c) => c.id)).toEqual(["n1", "n2", "m1"]);
    expect(matchLinkCandidates(cands, "zzz")).toEqual([]);
    expect(matchLinkCandidates(cands, "", 2)).toHaveLength(2); // cap respected
  });
});
