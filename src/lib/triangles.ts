import type { Chord, FretPos, Point, TriangleCandidate, TriangleShape, TriangleTemplate } from "../types";
import { normalizeNote } from "./fretboard";

export const DIMS = { label: 72, open: 52, nut: 18, fret: 44, row: 54, header: 70 };

export function pointCoords(point: Point, fretWidth = DIMS.fret) {
  return { x: DIMS.label + DIMS.open + DIMS.nut + (point.fret - 0.5) * fretWidth, y: DIMS.header + point.stringIndex * DIMS.row + 27 };
}

function triangleArea(a: Point, b: Point, c: Point) {
  const p1 = pointCoords(a), p2 = pointCoords(b), p3 = pointCoords(c);
  return Math.abs(p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2;
}

function signature(t: TriangleTemplate) { return `${t.thirdStringDelta}:${t.thirdFretDelta}|${t.fifthStringDelta}:${t.fifthFretDelta}`; }

export function shapesForTemplate(board: FretPos[][], chord: Chord | null, template: TriangleTemplate | null): TriangleShape[] {
  if (!chord || !template) return [];
  const [rootNote, thirdNote, fifthNote] = chord.notes.map(normalizeNote);
  const out: TriangleShape[] = [];
  for (let rs = 0; rs < board.length; rs += 1) {
    for (const root of board[rs]) {
      if (!root.isRoot || root.fret < 1) continue;
      const ts = rs + template.thirdStringDelta, fs = rs + template.fifthStringDelta, tf = root.fret + template.thirdFretDelta, ff = root.fret + template.fifthFretDelta;
      if (ts < 0 || fs < 0 || ts >= board.length || fs >= board.length || tf < 1 || ff < 1) continue;
      const third = board[ts].find((p) => p.fret === tf && normalizeNote(p.note) === thirdNote);
      const fifth = board[fs].find((p) => p.fret === ff && normalizeNote(p.note) === fifthNote);
      if (!third || !fifth) continue;
      out.push({ id: `${rs}-${root.fret}-${signature(template)}`, root: { stringIndex: rs, fret: root.fret, note: rootNote, role: "root" }, third: { stringIndex: ts, fret: tf, note: thirdNote, role: "third" }, fifth: { stringIndex: fs, fret: ff, note: fifthNote, role: "fifth" } });
    }
  }
  return out;
}

export function findTriangleCandidates(board: FretPos[][], chord: Chord | null): TriangleCandidate[] {
  if (!chord) return [];
  const found = new Map<string, TriangleCandidate>();
  for (let rs = 0; rs < board.length; rs += 1) {
    for (const root of board[rs]) {
      if (!root.isRoot || root.fret < 1) continue;
      for (let ts = 0; ts < board.length; ts += 1) {
        if (ts === rs) continue;
        for (const third of board[ts]) {
          if (!third.isThird || third.fret < 1) continue;
          for (let fs = 0; fs < board.length; fs += 1) {
            if (fs === rs || fs === ts) continue;
            for (const fifth of board[fs]) {
              if (!fifth.isFifth || fifth.fret < 1) continue;
              const spread = Math.max(root.fret, third.fret, fifth.fret) - Math.min(root.fret, third.fret, fifth.fret);
              if (spread > 4) continue;
              const template: TriangleTemplate = { thirdStringDelta: ts - rs, thirdFretDelta: third.fret - root.fret, fifthStringDelta: fs - rs, fifthFretDelta: fifth.fret - root.fret };
              const sig = signature(template);
              if (found.has(sig)) continue;
              const ar = triangleArea({ stringIndex: rs, fret: root.fret, note: root.note, role: "root" }, { stringIndex: ts, fret: third.fret, note: third.note, role: "third" }, { stringIndex: fs, fret: fifth.fret, note: fifth.note, role: "fifth" });
              if (ar < 180) continue;
              const repeatCount = shapesForTemplate(board, chord, template).length;
              if (repeatCount < 2) continue;
              found.set(sig, { ...template, signature: sig, repeatCount, score: ar + spread * 200 + Math.abs(template.thirdStringDelta) * 60 + Math.abs(template.fifthStringDelta) * 60 + Math.abs(template.thirdFretDelta) * 30 + Math.abs(template.fifthFretDelta) * 30 });
            }
          }
        }
      }
    }
  }
  return [...found.values()].sort((a, b) => a.score - b.score || b.repeatCount - a.repeatCount);
}

export function pickTemplate(candidates: TriangleCandidate[], mode: "primary" | "alternative") {
  if (!candidates.length) return null;
  if (mode === "primary") return candidates[0];
  return candidates.find((c) => c.signature !== candidates[0].signature) || null;
}
