import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadFromStorage, saveToStorage } from "../src/lib/storage";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads a value from localStorage", () => {
    localStorage.setItem("test", JSON.stringify({ a: 1 }));
    expect(loadFromStorage("test", { a: 0 })).toEqual({ a: 1 });
  });

  it("returns fallback when localStorage is empty", () => {
    expect(loadFromStorage("missing", 42)).toBe(42);
  });

  it("returns fallback on JSON parse errors", () => {
    localStorage.setItem("bad", "not-json");
    expect(loadFromStorage("bad", "fallback")).toBe("fallback");
  });

  it("saves a value to localStorage", () => {
    saveToStorage("x", { ok: true });
    expect(JSON.parse(localStorage.getItem("x") || "null")).toEqual({ ok: true });
  });

  it("silently ignores storage failures", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => saveToStorage("x", { ok: true })).not.toThrow();
    spy.mockRestore();
  });
});
