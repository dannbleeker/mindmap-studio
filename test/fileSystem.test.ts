import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NATIVE_EXT,
  ensureWritePermission,
  openMapFile,
  pickSaveHandle,
  readMapFile,
  readMapFromHandle,
  suggestedFileName,
  supportsFileSystemAccess,
  writeMapToHandle,
} from "../src/io/fileSystem";
import { serializeDoc } from "../src/io/json";
import type { MindMapDoc } from "../src/model/types";

const docOf = (title: string, id = "m1"): MindMapDoc => ({
  schemaVersion: 1,
  id,
  title,
  root: { id: "r", topic: title, children: [{ id: "c", topic: "child", children: [] }] },
});

/** A fake FileSystemFileHandle that records writes and reports a configurable permission state. */
function fakeHandle(name: string, opts: { perm?: PermissionState; content?: string } = {}) {
  const state = { name, written: opts.content ?? "", perm: opts.perm ?? "granted" };
  const requestPermission = vi.fn(async () => {
    state.perm = "granted";
    return "granted" as PermissionState;
  });
  const handle = {
    name,
    kind: "file" as const,
    async getFile() {
      return new File([state.written], name, { type: "application/json" });
    },
    async createWritable() {
      let buf = "";
      return {
        async write(data: string) {
          buf += data;
        },
        async close() {
          state.written = buf;
        },
      };
    },
    async queryPermission() {
      return state.perm;
    },
    requestPermission,
  };
  return { handle: handle as unknown as FileSystemFileHandle, state, requestPermission };
}

describe("suggestedFileName", () => {
  it("uses the title and the native extension", () => {
    expect(suggestedFileName(docOf("My Plan"))).toBe(`My Plan${NATIVE_EXT}`);
  });

  it("strips path-illegal characters", () => {
    expect(suggestedFileName(docOf('a/b:c*?"<>|d'))).toBe(`a_b_c_d${NATIVE_EXT}`);
  });

  it("falls back to 'mindmap' for an empty or dot-only title", () => {
    expect(suggestedFileName(docOf(""))).toBe(`mindmap${NATIVE_EXT}`);
    expect(suggestedFileName(docOf("..."))).toBe(`mindmap${NATIVE_EXT}`);
  });

  it("caps very long titles", () => {
    const name = suggestedFileName(docOf("x".repeat(200)));
    expect(name.length).toBeLessThanOrEqual(80 + NATIVE_EXT.length);
  });
});

describe("supportsFileSystemAccess", () => {
  beforeEach(() => {
    // jsdom doesn't implement the pickers; tests add/remove them explicitly.
    // biome-ignore lint/suspicious/noExplicitAny: deleting optional test-only globals.
    (window as any).showOpenFilePicker = undefined;
    // biome-ignore lint/suspicious/noExplicitAny: deleting optional test-only globals.
    (window as any).showSaveFilePicker = undefined;
  });

  it("is false without the pickers", () => {
    expect(supportsFileSystemAccess()).toBe(false);
  });

  it("is true when both pickers exist", () => {
    window.showOpenFilePicker = vi.fn();
    window.showSaveFilePicker = vi.fn();
    expect(supportsFileSystemAccess()).toBe(true);
  });
});

describe("read / write round-trip", () => {
  it("readMapFile parses a serialized doc", async () => {
    const doc = docOf("Round trip");
    const file = new File([serializeDoc(doc)], `x${NATIVE_EXT}`);
    expect(await readMapFile(file)).toMatchObject({ id: "m1", title: "Round trip" });
  });

  it("readMapFromHandle reads through the handle", async () => {
    const { handle } = fakeHandle("a.mmst", { content: serializeDoc(docOf("Via handle")) });
    expect((await readMapFromHandle(handle)).title).toBe("Via handle");
  });

  it("writeMapToHandle writes exactly the serialized bytes", async () => {
    const { handle, state } = fakeHandle("a.mmst");
    const doc = docOf("Persisted");
    await writeMapToHandle(handle, doc);
    expect(state.written).toBe(serializeDoc(doc));
  });
});

describe("ensureWritePermission", () => {
  it("returns true without prompting when already granted", async () => {
    const { handle, requestPermission } = fakeHandle("a.mmst", { perm: "granted" });
    expect(await ensureWritePermission(handle, false)).toBe(true);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("does not prompt in non-interactive mode when not granted", async () => {
    const { handle, requestPermission } = fakeHandle("a.mmst", { perm: "prompt" });
    expect(await ensureWritePermission(handle, false)).toBe(false);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("prompts in interactive mode and honours the grant", async () => {
    const { handle, requestPermission } = fakeHandle("a.mmst", { perm: "prompt" });
    expect(await ensureWritePermission(handle, true)).toBe(true);
    expect(requestPermission).toHaveBeenCalledOnce();
  });
});

describe("openMapFile / pickSaveHandle", () => {
  it("openMapFile returns the doc and handle", async () => {
    const { handle } = fakeHandle("open.mmst", { content: serializeDoc(docOf("Opened")) });
    window.showOpenFilePicker = vi.fn(async () => [handle]);
    const res = await openMapFile();
    expect(res?.doc.title).toBe("Opened");
    expect(res?.handle.name).toBe("open.mmst");
  });

  it("openMapFile returns null when the user cancels", async () => {
    window.showOpenFilePicker = vi.fn(async () => {
      throw new DOMException("cancelled", "AbortError");
    });
    expect(await openMapFile()).toBeNull();
  });

  it("pickSaveHandle returns the chosen handle", async () => {
    const { handle } = fakeHandle("save.mmst");
    window.showSaveFilePicker = vi.fn(async () => handle);
    expect((await pickSaveHandle(docOf("x")))?.name).toBe("save.mmst");
  });

  it("pickSaveHandle returns null when the user cancels", async () => {
    window.showSaveFilePicker = vi.fn(async () => {
      throw new DOMException("cancelled", "AbortError");
    });
    expect(await pickSaveHandle(docOf("x"))).toBeNull();
  });
});
