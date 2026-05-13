import type { Chord } from "../types";

export function ChordTabs({ chords, currentChordIndex, setCurrentChordIndex }: { chords: Chord[]; currentChordIndex: number; setCurrentChordIndex: (i: number) => void }) {
  return <div className="button-row wrap">{chords.map((c, i) => <button key={`${c.symbol}-${i}`} className={`pill ${currentChordIndex === i ? "pill-active" : ""}`} onClick={() => setCurrentChordIndex(i)}>{c.symbol}</button>)}</div>;
}
