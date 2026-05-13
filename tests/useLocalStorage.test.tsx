import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useLocalStorage } from "../src/hooks/useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => localStorage.clear());

  it("initializes from fallback and persists updates", () => {
    const { result } = renderHook(() => useLocalStorage("hook-key", 1));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);
    expect(JSON.parse(localStorage.getItem("hook-key") || "null")).toBe(2);
  });

  it("initializes from stored value", () => {
    localStorage.setItem("hook-key", JSON.stringify("saved"));
    const { result } = renderHook(() => useLocalStorage("hook-key", "initial"));
    expect(result.current[0]).toBe("saved");
  });
});
