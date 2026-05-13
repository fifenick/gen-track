import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTransport } from "../src/hooks/useTransport";
import type { Phase } from "../src/types";

function setup(initialPhase: Phase, introCount = 1, currentChordIndex = 0) {
  const state = {
    phase: initialPhase as Phase,
    countInBeat: 1,
    beat: 1,
    chordIndex: currentChordIndex,
    resetCalls: 0,
    ticks: [] as Array<{ beat: number; countIn: boolean }>,
  };

  const api = {
    get phase() { return state.phase; },
    get countInBeat() { return state.countInBeat; },
    get beat() { return state.beat; },
    get chordIndex() { return state.chordIndex; },
    get resetCalls() { return state.resetCalls; },
    get ticks() { return state.ticks; },
    setPhase: (phase: Phase) => { state.phase = phase; },
    args: {
      get phase() { return state.phase; },
      tempo: 120,
      introCount,
      chordCount: 2,
      get currentChordIndex() { return state.chordIndex; },
      getBarsForChord: (index: number) => (index === 0 ? 2 : 1),
      loopEnabled: true,
      onCountInBeat: (updater: (prev: number) => number) => { state.countInBeat = updater(state.countInBeat); },
      onBeat: (updater: (prev: number) => number) => { state.beat = updater(state.beat); },
      onChordIndex: (updater: (prev: number) => number) => { state.chordIndex = updater(state.chordIndex); },
      setPhase: (phase: Phase) => { state.phase = phase; },
      resetSequence: () => { state.resetCalls += 1; state.beat = 1; state.chordIndex = 0; },
      onTick: (beat: number, isCountIn: boolean) => { state.ticks.push({ beat, countIn: isCountIn }); },
    },
  };

  return api;
}

describe("useTransport", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("advances through count-in and switches to sequence", () => {
    const api = setup("count-in", 1);
    renderHook(() => useTransport(api.args));
    act(() => vi.advanceTimersByTime(2500));
    expect(api.phase).toBe("sequence");
    expect(api.resetCalls).toBe(1);
    expect(api.ticks.some((t) => t.countIn)).toBe(true);
  });

  it("advances beats and chord index using bars-per-chord", () => {
    const api = setup("sequence", 0);
    renderHook(() => useTransport(api.args));
    act(() => vi.advanceTimersByTime(500 * 8));
    expect(api.beat).toBe(1);
    expect(api.chordIndex).toBe(1);
    expect(api.ticks.some((t) => !t.countIn)).toBe(true);
  });
});
