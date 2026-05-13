import { describe, expect, it } from "vitest";
import { getScale, resolveProgression, SCALES, triadForDegree } from "../src/lib/music";

describe("music", () => {
  it("exposes scale data", () => {
    expect(SCALES.major.G).toEqual(["G", "A", "B", "C", "D", "E", "F#"]);
    expect(SCALES.minor.A).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
  });

  it("returns requested scale", () => {
    expect(getScale("G", "major")).toEqual(["G", "A", "B", "C", "D", "E", "F#"]);
    expect(getScale("D", "minor")).toEqual(["D", "E", "F", "G", "A", "Bb", "C"]);
  });

  it("falls back to defaults for unsupported keys", () => {
    expect(getScale("Z", "major")).toEqual(SCALES.major.G);
    expect(getScale("Z", "minor")).toEqual(SCALES.minor.A);
  });

  it("builds major, minor, and diminished triads", () => {
    const gMajorScale = getScale("G", "major");
    expect(triadForDegree(1, gMajorScale, "major")).toEqual({ degree: 1, symbol: "G", notes: ["G", "B", "D"] });
    expect(triadForDegree(6, gMajorScale, "major")).toEqual({ degree: 6, symbol: "Em", notes: ["E", "G", "B"] });
    expect(triadForDegree(7, gMajorScale, "major")).toEqual({ degree: 7, symbol: "F#dim", notes: ["F#", "A", "C"] });
  });

  it("resolves a progression string into chords", () => {
    expect(resolveProgression("1,6,5", "G", "major").map((c) => c.symbol)).toEqual(["G", "Em", "D"]);
  });

  it("ignores invalid progression degrees", () => {
    expect(resolveProgression("1,9,0, 5", "C", "major").map((c) => c.symbol)).toEqual(["C", "G"]);
  });
});
