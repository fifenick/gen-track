import { describe, expect, it } from "vitest";
import { buildFretboard, normalizeNote, NOTES, TUNINGS } from "../src/lib/fretboard";
import { resolveProgression } from "../src/lib/music";

describe("fretboard", () => {
  it("normalizes enharmonic notes", () => {
    expect(normalizeNote("Db")).toBe("C#");
    expect(normalizeNote("A#")).toBe("Bb");
    expect(normalizeNote("G")).toBe("G");
  });

  it("exports note and tuning constants", () => {
    expect(NOTES).toContain("F#");
    expect(TUNINGS.EADG).toEqual(["G", "D", "A", "E"]);
  });

  it("builds all strings for the selected tuning", () => {
    const chord = resolveProgression("1", "G", "major")[0];
    const board = buildFretboard("EADG", 12, chord, "G", "major", 1);
    expect(board).toHaveLength(4);
    expect(board[0][0].note).toBe("G");
    expect(board[3][0].note).toBe("E");
  });

  it("marks chord tones and targets", () => {
    const chord = resolveProgression("1", "G", "major")[0];
    const boardBeat1 = buildFretboard("EADG", 4, chord, "G", "major", 1);
    const boardBeat3 = buildFretboard("EADG", 4, chord, "G", "major", 3);

    expect(boardBeat1[0][0].isRoot).toBe(true);
    expect(boardBeat1[0][4].isThird).toBe(true);
    expect(boardBeat3[1][0].isFifth).toBe(true);
    expect(boardBeat1[0][0].isTarget).toBe(true);
    expect(boardBeat3[1][0].isTarget).toBe(true);
  });

  it("supports five-string tuning", () => {
    const chord = resolveProgression("1", "G", "major")[0];
    const board = buildFretboard("BEADG", 3, chord, "G", "major", 1);
    expect(board).toHaveLength(5);
    expect(board[4][0].note).toBe("B");
  });
});
