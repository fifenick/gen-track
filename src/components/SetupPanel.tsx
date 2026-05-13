import type { ChordSound, ChordToneSet, Groove, Mode, ProgressionOption } from "../types";

export function SetupPanel(props: {
  keyRoot: string; setKeyRoot: (v: string) => void;
  mode: Mode; setMode: (v: Mode) => void;
  groove: Groove; setGroove: (v: Groove) => void;
  progression: string; setProgression: (v: string) => void;
  progressionOptions: ProgressionOption[];
  tempo: number; setTempo: (v: number) => void;
  barPattern: string; setBarPattern: (v: string) => void;
  introCount: number; setIntroCount: (v: number) => void;
  chordSound: ChordSound; setChordSound: (v: ChordSound) => void;
  chordToneSet: ChordToneSet; setChordToneSet: (v: ChordToneSet) => void;
  onStart: () => void; onSave: () => void;
}) {
  return (
    <div className="card">
      <div className="card-header"><h2>Practice setup</h2><button className="ghost-button" onClick={props.onSave}>Save preset</button></div>
      <div className="form-grid">
        <label><span>Key</span><select value={props.keyRoot} onChange={(e) => props.setKeyRoot(e.target.value)}>{["C","G","D","A","E","F","Bb"].map((o) => <option key={o}>{o}</option>)}</select></label>
        <label><span>Mode</span><select value={props.mode} onChange={(e) => props.setMode(e.target.value as Mode)}><option>major</option><option>minor</option></select></label>
        <div className="full-span stack-gap">
          <label><span>Popular progressions</span><select value="" onChange={(e) => e.target.value && props.setProgression(e.target.value)}><option value="">Choose a progression…</option>{props.progressionOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
          <label><span>Progression (degrees)</span><input value={props.progression} onChange={(e) => props.setProgression(e.target.value)} /></label>
        </div>
        <label><span>Tempo: {props.tempo} BPM</span><input type="range" min="60" max="180" value={props.tempo} onChange={(e) => props.setTempo(parseInt(e.target.value, 10))} /></label>
        <label><span>Bars by progression degree</span><input value={props.barPattern} onChange={(e) => props.setBarPattern(e.target.value)} placeholder="e.g. 1,2,1" /></label>
        <label><span>Intro count</span><select value={String(props.introCount)} onChange={(e) => props.setIntroCount(parseInt(e.target.value, 10))}><option value="0">Off</option><option value="1">1 bar</option><option value="2">2 bars</option><option value="4">4 bars</option></select></label>
        <label><span>Chord tone range</span><select value={props.chordToneSet} onChange={(e) => props.setChordToneSet(e.target.value as ChordToneSet)}><option value="triad">Triad</option><option value="seventh">7th chord</option><option value="ninth">9th chord</option><option value="add9">Add9</option><option value="sus2">Sus2</option><option value="sus4">Sus4</option><option value="shell">Shell voicing</option><option value="wide-open">Wide open</option></select></label>
        <label><span>Chord sound</span><select value={props.chordSound} onChange={(e) => props.setChordSound(e.target.value as ChordSound)}>
          <option value="warm-pad">Warm pad</option><option value="piano">Piano</option><option value="electric-piano">Electric piano</option><option value="organ">Organ</option><option value="synth-pad">Synth pad</option><option value="choir">Choir</option><option value="brass">Brass</option><option value="marimba">Marimba</option><option value="lofi-keys">Lo-fi keys</option><option value="rock-guitar">Rock guitar</option><option value="violin">Violin</option><option value="cello">Cello</option><option value="trumpet">Trumpet</option><option value="trombone">Trombone</option><option value="harp">Harp</option><option value="808-sub">808 pitched down</option><option value="wobble-bass">Womp / wobble</option><option value="warped-fall">Warped descending melodic</option>
        </select></label>
        <label><span>Groove</span><select value={props.groove} onChange={(e) => props.setGroove(e.target.value as Groove)}>{[
          ["rock","Rock straight 8ths"],["rock-open-hat","Rock open-hat chorus"],["half-time-rock","Half-time rock"],["shuffle-blues","Shuffle blues"],["funk-16th","Funk 16th groove"],["muted-funk","Muted funk pocket"],["ballad-ride","Ballad with ride"],["tom-build","Tom-heavy build"],["trap-808","Trap 808"],["neo-soul","Neo soul pocket"],["latin-pop","Latin pop"],["cinematic-hybrid","Cinematic hybrid"] as const].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="full-span"><button className="primary-button" onClick={props.onStart}>Start practice session</button></div>
      </div>
    </div>
  );
}
