import { useEffect, useMemo, useRef, useState } from "react";
import { ScreenNav } from "./components/ScreenNav";
import { SetupPanel } from "./components/SetupPanel";
import { TransportPanel } from "./components/TransportPanel";
import { ChordTabs } from "./components/ChordTabs";
import { TriangleOverlay } from "./components/TriangleOverlay";
import { Fretboard } from "./components/Fretboard";
import { Legend } from "./components/Legend";
import { resolveProgression, voiceChordNotes } from "./lib/music";
import { getProgressionOptions } from "./lib/progressions";
import { buildFretboard } from "./lib/fretboard";
import { DIMS, findTriangleCandidates, pickTemplate, shapesForTemplate } from "./lib/triangles";
import { AudioEngine } from "./audio/engine";
import { useTransport } from "./hooks/useTransport";
import { useLocalStorage } from "./hooks/useLocalStorage";
import type { ChordSound, ChordToneSet, Groove, MixerState, Mode, OverlayMode, Phase, PracticeMode, Preset, Screen, Tuning } from "./types";

const initialMixer: MixerState = { click: 0.8, drums: 0.7, chords: 0.6, mute: { click: false, drums: false, chords: false }, solo: { click: false, drums: false, chords: false } };

export default function App() {
  const [screen, setScreen] = useState<Screen>("playback");
  const [keyRoot, setKeyRoot] = useState("G");
  const [mode, setMode] = useState<Mode>("major");
  const [progression, setProgression] = useState("1,6,5");
  const [tempo, setTempo] = useState(100);
  const [barPattern, setBarPattern] = useState("");
  const [introCount, setIntroCount] = useState(1);
  const [groove, setGroove] = useState<Groove>("rock");
  const [chordSound, setChordSound] = useState<ChordSound>("warm-pad");
  const [chordToneSet, setChordToneSet] = useState<ChordToneSet>("triad");
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("all");
  const [tuning, setTuning] = useState<Tuning>("EADG");
  const [visibleFrets, setVisibleFrets] = useState(12);
  const [showNoteNames, setShowNoteNames] = useState(true);
  const [showTriangles, setShowTriangles] = useState(true);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("primary");
  const [phase, setPhase] = useState<Phase>("stopped");
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [countInBeat, setCountInBeat] = useState(0);
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [savedPresets, setSavedPresets] = useLocalStorage<Preset[]>("bass-presets", [{ id: 1, name: "G Major 1-6-5", keyRoot: "G", mode: "major", progression: "1,6,5", tempo: 100, groove: "rock", introCount: 1, barPattern: "", chordSound: "warm-pad", chordToneSet: "triad" }]);
  const [mixer, setMixer] = useLocalStorage<MixerState>("bass-mixer", initialMixer);
  const audioRef = useRef(new AudioEngine());
  const [viewportWidth, setViewportWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const progressionOptions = useMemo(() => getProgressionOptions(keyRoot, mode, groove), [keyRoot, mode, groove]);
  const chords = useMemo(() => resolveProgression(progression, keyRoot, mode), [progression, keyRoot, mode]);
  const currentChord = chords[currentChordIndex] || chords[0] || null;
  const voicedChordNotes = useMemo(() => voiceChordNotes(currentChord, keyRoot, mode, chordToneSet), [currentChord, keyRoot, mode, chordToneSet]);
  const isMobile = viewportWidth <= 768;
  const mapFrets = isMobile ? 5 : visibleFrets;
  const hideNut = isMobile;
  const barPatternValues = useMemo(() => barPattern.split(",").map((v) => parseInt(v.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0), [barPattern]);
  const barsForChord = (index: number) => barPatternValues[index] || 1;

  const board = useMemo(() => buildFretboard(tuning, mapFrets, currentChord, keyRoot, mode, currentBeat), [tuning, mapFrets, currentChord, keyRoot, mode, currentBeat]);
  const candidates = useMemo(() => findTriangleCandidates(board, currentChord), [board, currentChord]);
  const template = useMemo(() => pickTemplate(candidates, overlayMode), [candidates, overlayMode]);
  const shapes = useMemo(() => shapesForTemplate(board, currentChord, template), [board, currentChord, template]);
  const hasAlternative = candidates.length > 1;
  const fullBleedWidth = isMobile ? viewportWidth - 16 : Math.max(960, viewportWidth - 72);
  const nutWidth = hideNut ? 0 : DIMS.nut;
  const baseChrome = DIMS.label + DIMS.open + nutWidth;
  const mobileUsableWidth = Math.max(280, fullBleedWidth - 16);
  const desktopUsableWidth = Math.max(fullBleedWidth - 80, baseChrome + mapFrets * DIMS.fret);
  const usableMapWidth = isMobile ? mobileUsableWidth : desktopUsableWidth;
  const fretWidth = isMobile
    ? Math.max(30, Math.floor((usableMapWidth - baseChrome) / mapFrets))
    : Math.max(DIMS.fret, Math.floor((usableMapWidth - baseChrome) / mapFrets));
  const width = baseChrome + mapFrets * fretWidth;
  const height = DIMS.header + board.length * DIMS.row;

  useEffect(() => {
    audioRef.current.setMixer(mixer);
  }, [mixer]);

  useEffect(() => {
    if (screen === "setup") stop();
  }, [screen]);

  useTransport({
    phase,
    tempo,
    introCount,
    chordCount: chords.length,
    currentChordIndex,
    getBarsForChord: barsForChord,
    loopEnabled,
    onCountInBeat: setCountInBeat,
    onBeat: setCurrentBeat,
    onChordIndex: setCurrentChordIndex,
    setPhase,
    resetSequence: () => {
      setCurrentChordIndex(0);
      setCurrentBeat(1);
    },
    onTick: async (beat, isCountIn) => {
      await audioRef.current.click(beat === 1);
      if (!isCountIn) {
        await audioRef.current.drum(groove, ((beat - 1) % 4) + 1, 60 / tempo);
        if (beat === 1 && currentChord) {
          const chordDurationSeconds = (60 / tempo) * 4 * barsForChord(currentChordIndex);
          await audioRef.current.chord(voicedChordNotes, chordDurationSeconds, chordSound);
        }
      }
    }
  });

  const start = () => {
    setCurrentChordIndex(0);
    setCurrentBeat(1);
    if (introCount > 0) {
      setCountInBeat(1);
      setPhase("count-in");
    } else {
      setCountInBeat(0);
      setPhase("sequence");
    }
  };
  const stop = () => {
    audioRef.current.stopChords();
    setPhase("stopped");
    setCurrentChordIndex(0);
    setCurrentBeat(1);
    setCountInBeat(0);
  };
  const savePreset = () => setSavedPresets((p) => [...p, { id: Date.now(), name: `${keyRoot} ${mode} ${progression}`, keyRoot, mode, progression, tempo, groove, introCount, barPattern, chordSound, chordToneSet }]);
  const loadPreset = (p: Preset) => {
    setKeyRoot(p.keyRoot); setMode(p.mode); setProgression(p.progression); setTempo(p.tempo); setGroove(p.groove); setIntroCount(p.introCount); setBarPattern(p.barPattern || ""); setChordSound(p.chordSound || "warm-pad"); setChordToneSet(p.chordToneSet || "triad"); setScreen("setup");
  };

  return (
    <div className="app-shell">
      <div className="container stack-gap-lg">
        <div className="hero card">
          <div>
            <div className="eyebrow">Prototype v1</div>
            <h1>Bass Practice Companion</h1>
            
          </div>
          <ScreenNav screen={screen} setScreen={setScreen} />
        </div>

        {screen === "setup" && <div className="two-col"><SetupPanel keyRoot={keyRoot} setKeyRoot={setKeyRoot} mode={mode} setMode={setMode} groove={groove} setGroove={setGroove} progression={progression} setProgression={setProgression} progressionOptions={progressionOptions} tempo={tempo} setTempo={setTempo} barPattern={barPattern} setBarPattern={setBarPattern} introCount={introCount} setIntroCount={setIntroCount} chordSound={chordSound} setChordSound={setChordSound} chordToneSet={chordToneSet} setChordToneSet={setChordToneSet} onStart={() => setScreen("playback")} onSave={savePreset} /><div className="card"><div className="card-header"><h2>Resolved progression preview</h2></div><div className="stack-gap"><div><div className="subtle">Selected key</div><div className="big-value">{keyRoot} {mode}</div></div><div><div className="subtle mb-8">Chords</div><div className="chip-wrap">{chords.map((c, i) => <div key={`${c.symbol}-${i}`} className="chip-card"><div className="chip-top">Degree {c.degree}</div><div className="chip-title">{c.symbol}</div><div className="chip-notes">{c.notes.join(" - ")}</div></div>)}</div></div></div></div></div>}

        {screen === "playback" && <div className="stack-gap-lg"><div className="card playback-map-card full-bleed-card"><div className="card-header"><h2>Bass fretboard map</h2></div><div className="stack-gap"><div className="summary-card"><div className="summary-kicker">Current harmony map</div><div className="summary-title">{currentChord ? `${currentChord.symbol} chord · ${keyRoot} ${mode} scale` : `${keyRoot} ${mode} scale`}</div><div className="summary-text">{currentChord ? `Chord notes: ${currentChord.notes.join(" – ")} · Intro count: ${introCount === 0 ? "off" : `${introCount} bar${introCount === 1 ? "" : "s"}`} · Status: ${phase === "count-in" ? `click-only count-in (${countInBeat}/${Math.max(1, introCount * 4)})` : phase === "sequence" ? "playing sequence" : "stopped"} · Bars: ${barsForChord(currentChordIndex)} for current chord${barPattern ? ` · Pattern: ${barPattern}` : ""} · Chord sound: ${chordSound} · Repeated ${overlayMode} triangles: ${shapes.length}` : "No chord selected"}</div></div><ChordTabs chords={chords} currentChordIndex={currentChordIndex} setCurrentChordIndex={setCurrentChordIndex} /><Fretboard board={board} tuning={tuning} visibleFrets={mapFrets} hideNut={hideNut} practiceMode={practiceMode} showNoteNames={showNoteNames} fullBleed fretWidth={fretWidth} width={width} height={height}>{showTriangles && shapes.length > 0 ? <TriangleOverlay shapes={shapes} overlayMode={overlayMode} width={width} height={height} fretWidth={fretWidth} /> : null}</Fretboard><Legend introCount={introCount} groove={groove} /></div></div><TransportPanel phase={phase} chordLabel={currentChord?.symbol || "—"} beatLabel={String(phase === "count-in" ? countInBeat : currentBeat)} practiceMode={practiceMode} setPracticeMode={setPracticeMode} introCount={introCount} setIntroCount={setIntroCount} loopEnabled={loopEnabled} setLoopEnabled={setLoopEnabled} showTriangles={showTriangles} setShowTriangles={setShowTriangles} overlayMode={overlayMode} setOverlayMode={setOverlayMode} hasAlternative={hasAlternative} groove={groove} chordSound={chordSound} onPlay={start} onStop={stop} /></div>}

        {screen === "settings" && <div className="two-col"><div className="card"><div className="card-header"><h2>Instrument settings</h2></div><div className="stack-gap"><label><span>Tuning</span><select value={tuning} onChange={(e) => setTuning(e.target.value as Tuning)}>{["EADG","BEADG","DropD"].map((o) => <option key={o}>{o}</option>)}</select></label><label><span>Visible frets: {visibleFrets}</span><input type="range" min="8" max="20" value={visibleFrets} onChange={(e) => setVisibleFrets(parseInt(e.target.value, 10))} /></label><label className="toggle-row"><span>Show note names</span><input type="checkbox" checked={showNoteNames} onChange={(e) => setShowNoteNames(e.target.checked)} /></label></div></div><div className="card"><div className="card-header"><h2>Audio mix</h2></div><div className="stack-gap">{(["click","drums","chords"] as const).map((channel) => <div key={channel} className="mixer-row"><div className="mixer-head"><strong>{channel}</strong><span>{Math.round(mixer[channel] * 100)}%</span></div><input type="range" min="0" max="100" value={Math.round(mixer[channel] * 100)} onChange={(e) => setMixer({ ...mixer, [channel]: parseInt(e.target.value, 10) / 100 })} /><div className="button-row"><button className={`pill ${mixer.mute[channel] ? "pill-active" : ""}`} onClick={() => setMixer({ ...mixer, mute: { ...mixer.mute, [channel]: !mixer.mute[channel] } })}>Mute</button><button className={`pill ${mixer.solo[channel] ? "pill-accent" : ""}`} onClick={() => setMixer({ ...mixer, solo: { ...mixer.solo, [channel]: !mixer.solo[channel] } })}>Solo</button></div></div>)}</div></div></div>}

        {screen === "progress" && <div className="one-col"><div className="card"><div className="card-header"><h2>Saved presets</h2></div><div className="stack-gap">{savedPresets.map((p) => <div key={p.id} className="preset-row"><button onClick={() => loadPreset(p)} className="preset-item"><div className="preset-title">{p.name}</div><div className="preset-meta">{p.keyRoot} {p.mode} · {p.progression} · {p.tempo} BPM · {p.groove} · {p.chordSound}</div></button><button className="ghost-button delete-button" onClick={() => setSavedPresets(savedPresets.filter((x) => x.id !== p.id))}>Delete</button></div>)}</div></div></div>}
      </div>
    </div>
  );
}
