import type { ChordSound, Groove, OverlayMode, Phase, PracticeMode } from "../types";

export function TransportPanel(props: {
  phase: Phase; chordLabel: string; beatLabel: string;
  practiceMode: PracticeMode; setPracticeMode: (v: PracticeMode) => void;
  introCount: number; setIntroCount: (v: number) => void;
  loopEnabled: boolean; setLoopEnabled: (v: boolean) => void;
  showTriangles: boolean; setShowTriangles: (v: boolean) => void;
  overlayMode: OverlayMode; setOverlayMode: (v: OverlayMode) => void;
  hasAlternative: boolean; groove: Groove; chordSound: ChordSound;
  onPlay: () => void; onStop: () => void;
}) {
  return (
    <div className="card">
      <div className="card-header"><h2>Transport</h2></div>
      <div className="stack-gap-lg">
        <div className="button-row"><button className="accent-button" onClick={props.onPlay}>Play</button><button className="ghost-button" onClick={props.onStop}>Stop</button></div>
        <div className="stat-grid"><div className="stat-card"><div className="stat-label">Current chord</div><div className="stat-value">{props.phase === "count-in" ? "Count-in" : props.chordLabel}</div></div><div className="stat-card"><div className="stat-label">Beat</div><div className="stat-value">{props.beatLabel}</div></div></div>
        <div><div className="section-label">Practice mode</div><div className="button-row wrap">{([ ["roots","Roots"],["thirds","3rds"],["fifths","5ths"],["all","All chord notes"],["scale","Scale"],["target","Target notes"] ] as Array<[PracticeMode,string]>).map(([id, label]) => <button key={id} onClick={() => props.setPracticeMode(id)} className={`pill ${props.practiceMode === id ? "pill-active" : ""}`}>{label}</button>)}</div></div>
        <label className="field-block"><span>Intro count</span><select value={String(props.introCount)} onChange={(e) => props.setIntroCount(parseInt(e.target.value, 10))}><option value="0">Off</option><option value="1">1 bar</option><option value="2">2 bars</option><option value="4">4 bars</option></select></label>
        <label className="toggle-row"><span>Loop enabled</span><input type="checkbox" checked={props.loopEnabled} onChange={(e) => props.setLoopEnabled(e.target.checked)} /></label>
        <label className="toggle-row"><span>Show repeated triangle shape</span><input type="checkbox" checked={props.showTriangles} onChange={(e) => props.setShowTriangles(e.target.checked)} /></label>
        <div className="field-block"><span>Triangle option</span><div className="button-row"><button className={`pill ${props.overlayMode === "primary" ? "pill-active" : ""}`} onClick={() => props.setOverlayMode("primary")}>Primary</button><button className={`pill ${props.overlayMode === "alternative" ? "pill-accent" : ""}`} onClick={() => props.setOverlayMode("alternative")} disabled={!props.hasAlternative}>Alternative</button></div>{!props.hasAlternative && <p className="hint">No second repeatable triangle shape was found for this chord and tuning.</p>}</div>
        <div className="meta-line">Groove: <strong>{props.groove}</strong> · Chord sound: <strong>{props.chordSound}</strong></div>
      </div>
    </div>
  );
}
