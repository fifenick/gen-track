import { describe, expect, it } from "vitest";
import { getProgressionOptions, PROGRESSIONS } from "../src/lib/progressions";

describe("progressions", () => {
  it("returns patterns for each groove", () => {
    expect(PROGRESSIONS.rock.length).toBeGreaterThan(0);
    expect(PROGRESSIONS["funk-16th"].length).toBeGreaterThan(0);
  });

  it("formats progression option labels with chord names", () => {
    const options = getProgressionOptions("G", "major", "rock");
    expect(options[0].value).toBe("1,6,5");
    expect(options[0].label).toContain("G");
    expect(options[0].label).toContain("Em");
    expect(options[0].label).toContain("D");
  });
});
