import type { Groove, Mode, ProgressionOption } from "../types";
import { getScale, triadForDegree } from "./music";

export const PROGRESSIONS: Record<Groove, string[]> = {
  rock: ["1,6,5", "1,4,5", "1,5,6,4", "2,5,1"],
  "rock-open-hat": ["1,5,6,4", "1,4,5", "1,6,5", "6,4,1,5"],
  "half-time-rock": ["1,5,6,4", "6,4,1,5", "1,4,5", "1,6,5"],
  "shuffle-blues": ["1,4,1,5", "1,6,2,5", "1,4,5", "2,5,1"],
  "funk-16th": ["1,7,6,7", "1,4,7", "1,2,4", "1,5,4"],
  "muted-funk": ["1,7,6,7", "1,5,4", "1,2,4", "1,4,7"],
  "ballad-ride": ["1,5,6,4", "1,6,4,5", "6,4,1,5", "1,4,2,5"],
  "tom-build": ["1,4,5", "1,5,6,4", "1,6,5", "2,5,1"],
  "trap-808": ["1,6,4,5", "6,4,1,5", "1,5,6,4", "1,4,2,5"],
  "neo-soul": ["1,4,2,5", "6,4,1,5", "1,6,4,5", "2,5,1"],
  "latin-pop": ["1,5,6,4", "1,4,5", "6,4,1,5", "2,5,1"],
  "cinematic-hybrid": ["1,6,3,7", "1,5,6,4", "6,4,1,5", "1,4,2,5"]
};

export function getProgressionOptions(keyRoot: string, mode: Mode, groove: Groove): ProgressionOption[] {
  const scale = getScale(keyRoot, mode);
  return PROGRESSIONS[groove].map((pattern) => ({
    value: pattern,
    label: `${pattern} · ${pattern
      .split(",")
      .map((v) => triadForDegree(parseInt(v.trim(), 10), scale, mode).symbol)
      .join(" – ")}`
  }));
}
