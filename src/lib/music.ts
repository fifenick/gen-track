import type { Chord, ChordToneSet, Mode } from "../types";

export const SCALES: Record<Mode, Record<string, string[]>> = {
  major: {
    C: ["C", "D", "E", "F", "G", "A", "B"],
    G: ["G", "A", "B", "C", "D", "E", "F#"],
    D: ["D", "E", "F#", "G", "A", "B", "C#"],
    A: ["A", "B", "C#", "D", "E", "F#", "G#"],
    E: ["E", "F#", "G#", "A", "B", "C#", "D#"],
    F: ["F", "G", "A", "Bb", "C", "D", "E"],
    Bb: ["Bb", "C", "D", "Eb", "F", "G", "A"],
  },
  minor: {
    A: ["A", "B", "C", "D", "E", "F", "G"],
    E: ["E", "F#", "G", "A", "B", "C", "D"],
    D: ["D", "E", "F", "G", "A", "Bb", "C"],
    G: ["G", "A", "Bb", "C", "D", "Eb", "F"],
    C: ["C", "D", "Eb", "F", "G", "Ab", "Bb"],
  },
};

export function getScale(keyRoot: string, mode: Mode): string[] {
  return SCALES[mode][keyRoot] || (mode === "major" ? SCALES.major.G : SCALES.minor.A);
}

export function triadForDegree(degree: number, scale: string[], mode: Mode): Chord {
  const idx = (degree - 1) % 7;
  const root = scale[idx];
  const third = scale[(idx + 2) % 7];
  const fifth = scale[(idx + 4) % 7];
  const majors = mode === "major" ? [1, 4, 5] : [3, 6, 7];
  const dims = mode === "major" ? [7] : [2];
  const symbol = majors.includes(degree) ? root : dims.includes(degree) ? `${root}dim` : `${root}m`;
  return { degree, symbol, notes: [root, third, fifth] };
}

export function resolveProgression(progression: string, keyRoot: string, mode: Mode): Chord[] {
  const scale = getScale(keyRoot, mode);
  return progression
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter((n) => n >= 1 && n <= 7)
    .map((n) => triadForDegree(n, scale, mode));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function voiceChordNotes(chord: Chord | null, keyRoot: string, mode: Mode, toneSet: ChordToneSet): string[] {
  if (!chord) return [];
  const scale = getScale(keyRoot, mode);
  const idx = (chord.degree - 1) % 7;
  const root = scale[idx];
  const second = scale[(idx + 1) % 7];
  const third = scale[(idx + 2) % 7];
  const fifth = scale[(idx + 4) % 7];
  const seventh = scale[(idx + 6) % 7];
  const ninth = scale[(idx + 1) % 7];

  switch (toneSet) {
    case "seventh":
      return unique([root, third, fifth, seventh]);
    case "ninth":
      return unique([root, third, fifth, seventh, ninth]);
    case "add9":
      return unique([root, third, fifth, ninth]);
    case "sus2":
      return unique([root, second, fifth, ninth]);
    case "sus4":
      return unique([root, scale[(idx + 3) % 7], fifth]);
    case "shell":
      return unique([root, third, seventh]);
    case "wide-open":
      return unique([root, fifth, third, seventh, ninth]);
    default:
      return unique([root, third, fifth]);
  }
}
