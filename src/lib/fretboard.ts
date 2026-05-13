import type { Chord, FretPos, Mode, Tuning } from "../types";
import { getScale } from "./music";

export const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
export const ENH: Record<string, string> = { Db: "C#", "D#": "Eb", Gb: "F#", "G#": "Ab", "A#": "Bb" };
export const TUNINGS: Record<Tuning, string[]> = { EADG: ["G", "D", "A", "E"], BEADG: ["G", "D", "A", "E", "B"], DropD: ["G", "D", "A", "D"] };

export function normalizeNote(note: string): string { return ENH[note] || note; }

export function buildFretboard(tuning: Tuning, visibleFrets: number, chord: Chord | null, keyRoot: string, mode: Mode, currentBeat: number): FretPos[][] {
  const strings = TUNINGS[tuning];
  const scale = getScale(keyRoot, mode).map(normalizeNote);
  const chordNotes = chord?.notes.map(normalizeNote) || [];
  const [root, third, fifth] = chordNotes;
  const target = currentBeat % 4 === 1 ? root : currentBeat % 4 === 3 ? fifth : third;
  return strings.map((open) => {
    const base = NOTES.indexOf(normalizeNote(open));
    return Array.from({ length: visibleFrets + 1 }, (_, fret) => {
      const note = NOTES[(base + fret) % NOTES.length];
      const isChordTone = chordNotes.includes(note);
      return { fret, note, isRoot: note === root, isThird: note === third, isFifth: note === fifth, isTarget: note === target, isChordTone, isScaleTone: scale.includes(note) };
    });
  });
}
