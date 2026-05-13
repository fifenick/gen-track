import { describe, expect, it } from "vitest";
import { buildFretboard } from "../src/lib/fretboard";
import { resolveProgression } from "../src/lib/music";
import { DIMS, findTriangleCandidates, pickTemplate, pointCoords, shapesForTemplate } from "../src/lib/triangles";

describe("triangles", () => {
  const chord = resolveProgression("1", "G", "major")[0];
  const board = buildFretboard("EADG", 12, chord, "G", "major", 1);

  it("returns coordinates using the shared dimensions", () => {
    expect(pointCoords({ stringIndex: 0, fret: 1, note: "G", role: "root" })).toEqual({
      x: DIMS.label + DIMS.open + DIMS.nut + 0.5 * DIMS.fret,
      y: DIMS.header + 27,
    });
  });

  it("finds repeatable triangle candidates", () => {
    const candidates = findTriangleCandidates(board, chord);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].repeatCount).toBeGreaterThanOrEqual(2);
  });

  it("selects a primary template and produces repeated shapes", () => {
    const primary = pickTemplate(findTriangleCandidates(board, chord), "primary");
    const shapes = shapesForTemplate(board, chord, primary);
    expect(primary).not.toBeNull();
    expect(shapes.length).toBeGreaterThanOrEqual(2);
  });

  it("returns a distinct alternative template when one exists", () => {
    const candidates = findTriangleCandidates(board, chord);
    const primary = pickTemplate(candidates, "primary");
    const alternative = pickTemplate(candidates, "alternative");
    if (alternative) {
      expect(`${primary?.thirdStringDelta}:${primary?.thirdFretDelta}|${primary?.fifthStringDelta}:${primary?.fifthFretDelta}`).not.toBe(
        `${alternative.thirdStringDelta}:${alternative.thirdFretDelta}|${alternative.fifthStringDelta}:${alternative.fifthFretDelta}`,
      );
      expect(shapesForTemplate(board, chord, alternative).length).toBeGreaterThanOrEqual(2);
    } else {
      expect(alternative).toBeNull();
    }
  });

  it("returns no shapes without a chord or template", () => {
    expect(findTriangleCandidates(board, null)).toEqual([]);
    expect(shapesForTemplate(board, chord, null)).toEqual([]);
  });
});
