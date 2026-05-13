import type { FretPos, PracticeMode, Tuning } from "../types";
import { TUNINGS } from "../lib/fretboard";
import { DIMS } from "../lib/triangles";

const FRET_MARKERS = [3, 5, 7, 9, 12];

function noteClass(pos: FretPos, mode: PracticeMode) {
  const active = mode === "roots" ? pos.isRoot : mode === "thirds" ? pos.isThird : mode === "fifths" ? pos.isFifth : mode === "all" ? pos.isChordTone : mode === "scale" ? pos.isScaleTone : pos.isTarget;
  if (!active) return "note-dot";
  if (mode === "target" && pos.isTarget) return "note-dot note-target";
  if (pos.isRoot) return "note-dot note-root";
  if (pos.isThird) return "note-dot note-third";
  if (pos.isFifth) return "note-dot note-fifth";
  return "note-dot note-scale";
}

export function Fretboard({ board, tuning, visibleFrets, hideNut = false, practiceMode, showNoteNames, children, fullBleed = false, fretWidth, width, height }: { board: FretPos[][]; tuning: Tuning; visibleFrets: number; hideNut?: boolean; practiceMode: PracticeMode; showNoteNames: boolean; children?: React.ReactNode; fullBleed?: boolean; fretWidth: number; width: number; height: number }) {
  const nutWidth = hideNut ? 0 : DIMS.nut;
  const cols = `${DIMS.label}px ${DIMS.open}px ${hideNut ? "" : `${DIMS.nut}px `}repeat(${visibleFrets}, ${fretWidth}px)`;
  return (
    <div className={`fretboard-wrap ${fullBleed ? "fretboard-wrap-fullbleed" : ""}`}>
      <div className="fretboard-inner" style={{ width, minWidth: width, height }}>
        {children}
        <div className="fret-grid header-grid" style={{ gridTemplateColumns: cols }}>
          <div /><div className="small-center">Open</div>{!hideNut ? <div /> : null}
          {Array.from({ length: visibleFrets }, (_, i) => <div key={i + 1} className="small-center">{i + 1}</div>)}
        </div>
        <div className="fret-grid marker-grid" style={{ gridTemplateColumns: cols }}>
          <div /><div />{!hideNut ? <div className="nut-cap" /> : null}
          {Array.from({ length: visibleFrets }, (_, i) => {
            const n = i + 1, marker = FRET_MARKERS.includes(n), dbl = n === 12;
            return <div key={n} className="marker-cell">{marker && <div className={`marker-dots ${dbl ? "double" : ""}`}>{dbl ? <><span /><span /></> : <span />}</div>}</div>;
          })}
        </div>
        <div className="map-inlays" style={{ left: DIMS.label + DIMS.open + nutWidth, width: visibleFrets * fretWidth, top: DIMS.header + 6, height: board.length * DIMS.row - 12, gridTemplateColumns: `repeat(${visibleFrets}, ${fretWidth}px)` }}>
          {Array.from({ length: visibleFrets }, (_, i) => {
            const n = i + 1;
            if (!FRET_MARKERS.includes(n)) return <div key={n} className="map-inlay-slot" />;
            const dbl = n === 12;
            return <div key={n} className="map-inlay-slot"><div className={`map-inlay-dots ${dbl ? "double" : "single"}`}><span />{dbl ? <span /> : null}</div></div>;
          })}
        </div>
        <div className="strings-block">
          {board.map((stringFrets, stringIndex) => {
            const open = stringFrets[0], fretted = stringFrets.slice(1);
            return (
              <div key={stringIndex} className="fret-grid string-row" style={{ gridTemplateColumns: cols }}>
                <div className="string-label">{TUNINGS[tuning][stringIndex]}</div>
                <div className="open-cell"><div className="string-line" /><div className={noteClass(open, practiceMode)}>{showNoteNames ? open.note : "•"}</div></div>
                {!hideNut ? <div className="nut-bar" /> : null}
                {fretted.map((pos) => <div key={pos.fret} className="fret-cell"><div className="fret-line" /><div className="string-line" /><div className={noteClass(pos, practiceMode)}>{showNoteNames ? pos.note : "•"}</div></div>)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
