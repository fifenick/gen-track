# Bass Practice Companion

Bass Practice Companion is a browser-based bass practice prototype built with React and TypeScript. It lets a player choose a key, progression, groove, chord sound, and timing options, then practice against a backing track while following a synchronized fretboard map with repeatable triangle overlays for root–3rd–5th relationships.

## What the app does

The current prototype includes:

- setup, playback, settings, and progress screens
- key and mode selection
- groove selection with multiple distinct drum feels
- manual progression entry plus suggested progressions by groove
- intro count before playback starts
- mixer controls for click, drums, and chords
- chord sound selection
- preset saving in local storage
- synchronized fretboard note map
- repeatable **primary** and **alternative** triangle overlay detection
- browser audio for click, drums, sustained chords, and chord crossfades

## Main practice workflow

1. Choose a key and mode.
2. Choose a groove.
3. Select a suggested progression or type your own progression degrees.
4. Set tempo, intro count, and bars per chord.
5. Pick a chord sound.
6. Start playback.
7. Follow the fretboard and switch between primary and alternative triangle overlays.

## Triangle overlay logic

The fretboard overlay system tries to find repeating chord-shape triangles using the chord tones:

- root
- 3rd
- 5th

Each plotted shape must:

- draw a closed triangle from **root → 3rd → 5th → root**
- be compact
- be repeatable at least twice across the neck
- avoid using a second arbitrary template in the same mode

The app supports two overlay modes:

### Primary triangle
The smallest repeatable triangle shape found for the current fretboard/chord context.

### Alternative triangle
The next distinct repeatable triangle shape after the primary one.

If no second valid repeatable triangle exists, the alternative option is disabled.

## Tech stack

- React 18
- TypeScript
- Vite
- Vitest
- Testing Library
- plain CSS
- Web Audio API

## Project structure

```text
src/
  components/
    ChordTabs.tsx
    Fretboard.tsx
    Legend.tsx
    ScreenNav.tsx
    SetupPanel.tsx
    TransportPanel.tsx
    TriangleOverlay.tsx
  audio/
    engine.ts
  hooks/
    useLocalStorage.ts
    useTransport.ts
  lib/
    fretboard.ts
    music.ts
    progressions.ts
    storage.ts
    triangles.ts
  types/
    index.ts
  App.tsx
  main.tsx
  styles.css
tests/
  audio-engine.test.ts
  fretboard.test.ts
  music.test.ts
  progressions.test.ts
  storage.test.ts
  triangles.test.ts
  useLocalStorage.test.tsx
  useTransport.test.tsx
```

## Important modules

### `src/lib/music.ts`
Responsible for:

- major and minor scale lookup
- building triads by degree
- resolving progression strings into chord arrays

### `src/lib/progressions.ts`
Responsible for:

- groove-specific progression suggestions
- formatting progression labels with chord names

### `src/lib/fretboard.ts`
Responsible for:

- tuning definitions
- enharmonic normalization
- building the displayed fretboard map
- marking roots, 3rds, 5ths, targets, chord tones, and scale tones

### `src/lib/triangles.ts`
Responsible for:

- triangle geometry scoring
- repeatable triangle candidate discovery
- primary vs alternative template selection
- converting templates into rendered shapes

### `src/hooks/useTransport.ts`
Responsible for:

- count-in timing
- chord duration handling
- beat advancement
- chord index progression
- looping behavior

### `src/audio/engine.ts`
Responsible for:

- click playback
- drum groove playback
- sustained chord playback
- mixer routing
- chord transitions and crossfade behavior

## Running locally

### Install

```bash
npm install
```

### Start development server

```bash
npm run dev
```

### Build production bundle

```bash
npm run build
```

### Run tests

```bash
npm test
```

## Unit tests

The project now includes unit tests for all exported core utility and hook functions, plus smoke coverage for the public audio engine API.

### Covered areas

- `music.ts`
  - `getScale`
  - `triadForDegree`
  - `resolveProgression`
- `progressions.ts`
  - `getProgressionOptions`
- `fretboard.ts`
  - `normalizeNote`
  - `buildFretboard`
- `triangles.ts`
  - `pointCoords`
  - `findTriangleCandidates`
  - `pickTemplate`
  - `shapesForTemplate`
- `storage.ts`
  - `loadFromStorage`
  - `saveToStorage`
- `useLocalStorage.ts`
  - hook initialization and persistence behavior
- `useTransport.ts`
  - count-in behavior
  - beat progression
  - bars-per-chord timing
- `audio/engine.ts`
  - mixer application
  - click playback
  - chord playback
  - drum playback
  - stop behavior

### Notes on audio tests

The audio engine tests use a mocked `AudioContext`. They do not validate subjective sound quality. They verify that the public methods run successfully and that the browser-audio integration points are exercised safely in a test environment.

## Current limitations

This is still a prototype. A few important areas are still good candidates for future work:

- more musical variation in chord voicings
- better humanization of drum grooves
- richer chord instruments or sampled playback
- loop-region practice
- section-based arrangements
- import/export of presets
- mobile optimization
- end-to-end browser playback tests

## Suggested next steps

1. Add end-to-end playback tests.
2. Add loop-region practice tools.
3. Add more advanced chord voicing and inversions.
4. Improve arrangement realism with fills and transitions.
5. Add import/export for presets.

## Troubleshooting

### The app starts but there is no sound

Check that:

- your browser allows audio playback
- you have interacted with the page before pressing play
- your mixer channels are not muted or soloed unexpectedly

### Alternative triangle is disabled

That means the current chord/tuning/fret-range combination did not produce a second distinct repeatable triangle that passed the selection rules.

### Presets are not saving

Preset saving depends on local storage. Try the app in a normal browser window with local storage enabled.

## License / usage

This project is currently packaged as a prototype starter and intended for further development rather than production deployment as-is.
