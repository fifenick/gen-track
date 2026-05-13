import type { ChordSound, Groove, MixerState } from "../types";

type ActiveStop = (fadeSeconds?: number) => void;

type VoiceConfig = {
  types: OscillatorType[];
  gains: number[];
  detunes?: number[];
  octaveOffsets?: number[];
  filter?: { type: BiquadFilterType; frequency: number; q?: number };
  attack: number;
  sustain: number;
  release: number;
  vibratoHz?: number;
  vibratoDepth?: number;
  tremoloHz?: number;
  tremoloDepth?: number;
  fm?: { ratio: number; depth: number };
  glideDown?: number;
};

const CHANNELS = ["click", "drums", "chords"] as const;

export class AudioEngine {
  private context: AudioContext | null = null;
  private gains: Record<typeof CHANNELS[number], GainNode | null> = { click: null, drums: null, chords: null };
  private activeChordStops: ActiveStop[] = [];

  private async ensure() {
    if (!this.context) {
      this.context = new AudioContext();
      CHANNELS.forEach((key) => {
        this.gains[key] = this.context!.createGain();
        this.gains[key]!.connect(this.context!.destination);
      });
    }
    if (this.context.state === "suspended") await this.context.resume();
    return this.context;
  }

  async setMixer(mixer: MixerState) {
    await this.ensure();
    const anySolo = Object.values(mixer.solo).some(Boolean);
    CHANNELS.forEach((key) => {
      const gain = this.gains[key];
      if (!gain) return;
      const muted = mixer.mute[key] || (anySolo && !mixer.solo[key]);
      gain.gain.value = muted ? 0.0001 : Math.max(0.0001, mixer[key]);
    });
  }

  async click(accent = false) {
    const ctx = await this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = accent ? 1250 : 920;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(this.gains.click!);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(accent ? 0.17 : 0.08, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  stopChords() {
    this.activeChordStops.forEach((stop) => stop(0.08));
    this.activeChordStops = [];
  }

  private noteFreq(note: string) {
    const base: Record<string, number> = { C: 261.63, "C#": 277.18, D: 293.66, Eb: 311.13, E: 329.63, F: 349.23, "F#": 369.99, G: 392.0, Ab: 415.3, A: 440.0, Bb: 466.16, B: 493.88 };
    return base[note] || 220;
  }

  private fadeOutActiveChords(fadeSeconds = 0.12) {
    this.activeChordStops.forEach((stop) => stop(fadeSeconds));
    this.activeChordStops = [];
  }

  private makeVoice(ctx: AudioContext, frequency: number, destination: AudioNode, config: VoiceConfig, voiceIndex: number, start: number, holdUntil: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const stops: ActiveStop[] = [];

    osc.type = config.types[voiceIndex % config.types.length];
    const octave = config.octaveOffsets?.[voiceIndex % (config.octaveOffsets?.length || 1)] ?? 0;
    const detune = config.detunes?.[voiceIndex % (config.detunes?.length || 1)] ?? 0;
    const baseFreq = frequency * Math.pow(2, octave);
    osc.frequency.value = baseFreq;
    osc.detune.value = detune;

    if (config.glideDown) {
      osc.frequency.setValueAtTime(baseFreq * config.glideDown, start);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, start + Math.max(0.03, config.attack * 2));
    }

    filter.type = config.filter?.type || "lowpass";
    filter.frequency.value = config.filter?.frequency || 1800;
    filter.Q.value = config.filter?.q || 0.7;

    gain.gain.value = 0.0001;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    const peak = config.gains[voiceIndex % config.gains.length];
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + Math.max(0.003, config.attack));
    gain.gain.setValueAtTime(Math.max(0.0001, peak * config.sustain), holdUntil);
    gain.gain.exponentialRampToValueAtTime(0.0001, holdUntil + config.release);

    if (config.vibratoDepth) {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = config.vibratoHz ?? 5;
      lfoGain.gain.value = config.vibratoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);
      lfo.start(start);
      lfo.stop(holdUntil + config.release + 0.05);
      stops.push(() => { try { lfo.stop(ctx.currentTime + 0.02); } catch {} });
    }

    if (config.fm) {
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      mod.type = "sine";
      mod.frequency.value = baseFreq * config.fm.ratio;
      modGain.gain.value = config.fm.depth;
      mod.connect(modGain);
      modGain.connect(osc.frequency);
      mod.start(start);
      mod.stop(holdUntil + config.release + 0.05);
      stops.push(() => { try { mod.stop(ctx.currentTime + 0.02); } catch {} });
    }

    osc.start(start);
    osc.stop(holdUntil + config.release + 0.05);
    stops.push((fadeSeconds = 0.08) => {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fadeSeconds);
        osc.stop(ctx.currentTime + fadeSeconds + 0.01);
      } catch {}
    });

    return stops;
  }

  async chord(notes: string[], durationSeconds = 2, sound: ChordSound = "warm-pad") {
    const ctx = await this.ensure();
    const now = ctx.currentTime;
    const safeDuration = Math.max(0.25, durationSeconds);
    const holdUntil = now + safeDuration;
    this.fadeOutActiveChords(1.0);

    const configs: Record<ChordSound, VoiceConfig> = {
      "warm-pad": { types: ["sawtooth", "triangle", "sine"], gains: [0.028, 0.02, 0.015], detunes: [-7, 0, 7], octaveOffsets: [-1, 0, 0], filter: { type: "lowpass", frequency: 900, q: 0.9 }, attack: 0.18, sustain: 0.85, release: 0.35, vibratoHz: 4.5, vibratoDepth: 7, tremoloHz: 0.48, tremoloDepth: 0.07 },
      "piano": { types: ["triangle", "sine", "triangle"], gains: [0.05, 0.02, 0.015], octaveOffsets: [-1, 0, 1], filter: { type: "lowpass", frequency: 2600, q: 0.6 }, attack: 0.006, sustain: 0.12, release: 0.18 },
      "electric-piano": { types: ["sine", "sine", "triangle"], gains: [0.04, 0.018, 0.015], octaveOffsets: [-1, 0, 0], filter: { type: "bandpass", frequency: 1400, q: 1.4 }, attack: 0.01, sustain: 0.35, release: 0.22, fm: { ratio: 2.5, depth: 45 } },
      "organ": { types: ["square", "square", "square"], gains: [0.018, 0.014, 0.012], octaveOffsets: [-1, 0, 1], detunes: [0, 3, -3], filter: { type: "lowpass", frequency: 3200, q: 0.4 }, attack: 0.015, sustain: 0.95, release: 0.08, vibratoHz: 5.2, vibratoDepth: 3, tremoloHz: 0.62, tremoloDepth: 0.05 },
      "synth-pad": { types: ["sawtooth", "sawtooth", "triangle"], gains: [0.026, 0.02, 0.014], detunes: [-14, 0, 14], octaveOffsets: [-1, 0, 0], filter: { type: "lowpass", frequency: 700, q: 1.5 }, attack: 0.08, sustain: 0.78, release: 0.28, vibratoHz: 3.2, vibratoDepth: 11, tremoloHz: 0.4, tremoloDepth: 0.08 },
      "choir": { types: ["triangle", "sine", "triangle"], gains: [0.02, 0.018, 0.012], detunes: [-4, 0, 4], octaveOffsets: [0, 0, 1], filter: { type: "bandpass", frequency: 1100, q: 0.8 }, attack: 0.22, sustain: 0.9, release: 0.35, vibratoHz: 5.8, vibratoDepth: 8, tremoloHz: 0.36, tremoloDepth: 0.06 },
      "brass": { types: ["sawtooth", "square", "sawtooth"], gains: [0.032, 0.02, 0.018], detunes: [-2, 0, 3], octaveOffsets: [-1, 0, 0], filter: { type: "lowpass", frequency: 1800, q: 1.2 }, attack: 0.03, sustain: 0.7, release: 0.12 },
      "marimba": { types: ["sine", "triangle", "sine"], gains: [0.055, 0.022, 0.018], octaveOffsets: [0, 1, 2], filter: { type: "bandpass", frequency: 2200, q: 1.6 }, attack: 0.004, sustain: 0.1, release: 0.18, fm: { ratio: 3.8, depth: 30 } },
      "lofi-keys": { types: ["triangle", "triangle", "sine"], gains: [0.03, 0.016, 0.012], detunes: [-9, 0, 9], octaveOffsets: [-1, 0, 1], filter: { type: "lowpass", frequency: 1200, q: 0.7 }, attack: 0.025, sustain: 0.45, release: 0.22, vibratoHz: 2.1, vibratoDepth: 2 },
      "rock-guitar": { types: ["sawtooth", "square", "triangle"], gains: [0.024, 0.017, 0.011], detunes: [-3, 0, 4], octaveOffsets: [-1, 0, 0], filter: { type: "lowpass", frequency: 2100, q: 1.8 }, attack: 0.01, sustain: 0.52, release: 0.16 },
      "violin": { types: ["sawtooth", "triangle", "sawtooth"], gains: [0.02, 0.014, 0.012], detunes: [-5, 0, 5], octaveOffsets: [0, 1, 1], filter: { type: "bandpass", frequency: 1600, q: 0.9 }, attack: 0.11, sustain: 0.86, release: 0.24, vibratoHz: 5.8, vibratoDepth: 14 },
      "cello": { types: ["sawtooth", "triangle", "sine"], gains: [0.028, 0.018, 0.012], detunes: [-4, 0, 4], octaveOffsets: [-2, -1, 0], filter: { type: "lowpass", frequency: 1000, q: 0.85 }, attack: 0.12, sustain: 0.88, release: 0.26, vibratoHz: 4.8, vibratoDepth: 10 },
      "trumpet": { types: ["sawtooth", "square", "sawtooth"], gains: [0.03, 0.018, 0.012], detunes: [-2, 0, 2], octaveOffsets: [-1, 0, 1], filter: { type: "bandpass", frequency: 1400, q: 1.1 }, attack: 0.025, sustain: 0.68, release: 0.12, vibratoHz: 5.4, vibratoDepth: 6 },
      "trombone": { types: ["sawtooth", "triangle", "square"], gains: [0.03, 0.02, 0.012], detunes: [-3, 0, 3], octaveOffsets: [-2, -1, 0], filter: { type: "lowpass", frequency: 900, q: 1.0 }, attack: 0.035, sustain: 0.72, release: 0.14, vibratoHz: 4.2, vibratoDepth: 4 },
      "harp": { types: ["triangle", "sine", "triangle"], gains: [0.045, 0.018, 0.012], octaveOffsets: [0, 1, 2], filter: { type: "highpass", frequency: 180, q: 0.7 }, attack: 0.004, sustain: 0.08, release: 0.55, fm: { ratio: 2.2, depth: 22 } },
      "808-sub": { types: ["sine", "sine", "triangle"], gains: [0.05, 0.018, 0.012], detunes: [0, 0, -2], octaveOffsets: [-3, -2, -1], filter: { type: "lowpass", frequency: 280, q: 0.8 }, attack: 0.008, sustain: 0.94, release: 0.2, glideDown: 1.9 },
      "wobble-bass": { types: ["sawtooth", "square", "triangle"], gains: [0.04, 0.024, 0.014], detunes: [-7, 0, 7], octaveOffsets: [-2, -1, 0], filter: { type: "lowpass", frequency: 500, q: 1.6 }, attack: 0.03, sustain: 0.8, release: 0.18, tremoloHz: 0.9, tremoloDepth: 0.1, vibratoHz: 2.3, vibratoDepth: 9 },
      "warped-fall": { types: ["triangle", "sine", "sawtooth"], gains: [0.03, 0.018, 0.012], detunes: [-12, 0, 12], octaveOffsets: [0, 1, 2], filter: { type: "bandpass", frequency: 1100, q: 1.2 }, attack: 0.02, sustain: 0.5, release: 0.5, glideDown: 1.35, vibratoHz: 1.8, vibratoDepth: 16 },
    };

    const cfg = configs[sound];
    notes.forEach((note, chordToneIndex) => {
      const rootFreq = this.noteFreq(note);
      const bus = ctx.createGain();
      bus.gain.value = 0.9;
      bus.connect(this.gains.chords!);
      const trem = ctx.createOscillator();
      const tremGain = ctx.createGain();
      const tremDepth = cfg.tremoloDepth ?? 0.05;
      trem.type = "sine";
      trem.frequency.value = cfg.tremoloHz ?? 0.5;
      tremGain.gain.value = tremDepth;
      trem.connect(tremGain);
      tremGain.connect(bus.gain);
      bus.gain.setValueAtTime(0.9 - tremDepth * 0.5, now);
      trem.start(now);
      trem.stop(holdUntil + cfg.release + 0.05);

      const stops: ActiveStop[] = [];
      const voiceCount = ["organ","choir","trumpet","trombone"].includes(sound) ? 4 : 3;
      for (let voice = 0; voice < voiceCount; voice += 1) {
        const freq = rootFreq * (chordToneIndex === 0 && ["808-sub","wobble-bass","cello","trombone"].includes(sound) ? 0.5 : 1);
        stops.push(...this.makeVoice(ctx, freq, bus, cfg, voice, now, holdUntil));
      }

      this.activeChordStops.push((fadeSeconds = 0.08) => {
        try {
          bus.gain.cancelScheduledValues(ctx.currentTime);
          bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), ctx.currentTime);
          bus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fadeSeconds);
          trem.stop(ctx.currentTime + fadeSeconds + 0.01);
        } catch {}
        stops.forEach((s) => s(fadeSeconds));
      });
    });
  }

  private playNoise(ctx: AudioContext, start: number, duration: number, level: number, highpass = 4000, bandpass: number | null = null) {
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = highpass;
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.connect(hp);
    let last: AudioNode = hp;
    if (bandpass) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = bandpass;
      hp.connect(bp);
      last = bp;
    }
    last.connect(gain);
    gain.connect(this.gains.drums!);
    gain.gain.setValueAtTime(Math.max(0.0001, level), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.start(start);
    source.stop(start + duration + 0.01);
  }

  private playTone(ctx: AudioContext, start: number, freq: number, decay: number, level: number, endFreq?: number, type: OscillatorType = "sine") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + decay * 0.9);
    gain.gain.setValueAtTime(Math.max(0.0001, level), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + decay);
    osc.connect(gain);
    gain.connect(this.gains.drums!);
    osc.start(start);
    osc.stop(start + decay + 0.01);
  }

  private kick(ctx: AudioContext, start: number, level: number) { this.playTone(ctx, start, 120, 0.18, level, 45); }
  private kick808(ctx: AudioContext, start: number, level: number) { this.playTone(ctx, start, 70, 0.36, level, 28); }
  private snare(ctx: AudioContext, start: number, level: number) { this.playNoise(ctx, start, 0.12, level, 1500, 1800); this.playTone(ctx, start, 180, 0.08, level * 0.35, 120); }
  private clap(ctx: AudioContext, start: number, level: number) { this.playNoise(ctx, start, 0.09, level, 1800, 1400); this.playNoise(ctx, start + 0.012, 0.07, level * 0.7, 2200, 1700); }
  private hat(ctx: AudioContext, start: number, level: number, open = false) { this.playNoise(ctx, start, open ? 0.12 : 0.045, level, open ? 5000 : 7000, null); }
  private rim(ctx: AudioContext, start: number, level: number) { this.playNoise(ctx, start, 0.03, level, 2500, 2100); }
  private tom(ctx: AudioContext, start: number, freq: number, level: number) { this.playTone(ctx, start, freq, 0.16, level, freq * 0.6); }

  async drum(groove: Groove, beat: number, beatSeconds: number) {
    const ctx = await this.ensure();
    const now = ctx.currentTime;
    const quarter = beatSeconds;
    const eighth = quarter / 2;
    const triplet = quarter / 3;
    const sixteenth = quarter / 4;
    const hats16 = (base: number, levels = [0.022, 0.013, 0.018, 0.012]) => {
      this.hat(ctx, base, levels[0]);
      this.hat(ctx, base + sixteenth, levels[1]);
      this.hat(ctx, base + eighth, levels[2]);
      this.hat(ctx, base + sixteenth * 3, levels[3]);
    };

    switch (groove) {
      case "rock":
        this.hat(ctx, now, 0.03); this.hat(ctx, now + eighth, 0.023);
        if (beat === 1) { this.kick(ctx, now, 0.23); this.kick(ctx, now + eighth, 0.09); }
        if (beat === 2 || beat === 4) this.snare(ctx, now, 0.15);
        if (beat === 3) { this.kick(ctx, now, 0.19); this.kick(ctx, now + eighth * 1.5, 0.06); }
        return;
      case "rock-open-hat":
        this.hat(ctx, now, 0.03); this.hat(ctx, now + eighth, beat === 4 ? 0.032 : 0.018, beat === 4 || beat === 2);
        if (beat === 1) { this.kick(ctx, now, 0.22); this.kick(ctx, now + eighth, 0.07); }
        if (beat === 2 || beat === 4) this.snare(ctx, now, 0.145);
        if (beat === 3) this.kick(ctx, now, 0.18);
        return;
      case "half-time-rock":
        this.hat(ctx, now, 0.024); this.hat(ctx, now + eighth, 0.018);
        if (beat === 1) { this.kick(ctx, now, 0.22); this.kick(ctx, now + eighth * 1.5, 0.08); }
        if (beat === 3) this.snare(ctx, now, 0.16);
        if (beat === 4) this.kick(ctx, now + eighth, 0.08);
        return;
      case "shuffle-blues":
        this.hat(ctx, now, 0.028); this.hat(ctx, now + triplet * 2, 0.021);
        if (beat === 1 || beat === 3) this.kick(ctx, now, beat === 1 ? 0.2 : 0.17);
        if (beat === 2 || beat === 4) { this.snare(ctx, now, 0.12); this.playNoise(ctx, now - 0.01, 0.03, 0.03, 1800, 1500); }
        if (beat === 4) this.kick(ctx, now + triplet * 2, 0.07);
        return;
      case "funk-16th":
        hats16(now, [0.026, 0.011, 0.021, 0.013]);
        if (beat === 1) { this.kick(ctx, now, 0.2); this.kick(ctx, now + sixteenth * 3, 0.08); }
        if (beat === 2 || beat === 4) { this.clap(ctx, now, 0.11); this.playNoise(ctx, now - 0.01, 0.025, 0.025, 1800, 1500); }
        if (beat === 3) { this.kick(ctx, now + sixteenth * 2, 0.14); this.kick(ctx, now + sixteenth * 3, 0.06); }
        return;
      case "muted-funk":
        hats16(now, [0.017, 0.008, 0.014, 0.008]);
        if (beat === 1) this.kick(ctx, now, 0.16);
        if (beat === 2 || beat === 4) { this.clap(ctx, now, 0.085); this.playNoise(ctx, now - 0.012, 0.02, 0.02, 1700, 1300); }
        if (beat === 3) this.kick(ctx, now + sixteenth, 0.12);
        if (beat === 4) this.kick(ctx, now + sixteenth * 2, 0.06);
        return;
      case "ballad-ride":
        this.hat(ctx, now, 0.014, true); this.hat(ctx, now + eighth, 0.012, true);
        if (beat === 1) this.kick(ctx, now, 0.16);
        if (beat === 3) this.kick(ctx, now, 0.1);
        if (beat === 2 || beat === 4) this.snare(ctx, now, 0.075);
        if (beat === 4) this.hat(ctx, now + eighth, 0.018, true);
        return;
      case "tom-build":
        this.hat(ctx, now, 0.012);
        if (beat === 1) { this.kick(ctx, now, 0.16); this.tom(ctx, now + eighth, 180, 0.08); }
        if (beat === 2) { this.tom(ctx, now, 160, 0.09); this.tom(ctx, now + eighth, 140, 0.085); }
        if (beat === 3) { this.kick(ctx, now, 0.14); this.tom(ctx, now + eighth, 120, 0.09); }
        if (beat === 4) { this.tom(ctx, now, 140, 0.09); this.tom(ctx, now + sixteenth, 120, 0.085); this.tom(ctx, now + eighth, 100, 0.08); this.tom(ctx, now + sixteenth * 3, 85, 0.075); this.snare(ctx, now + eighth, 0.07); }
        return;
      case "trap-808":
        this.hat(ctx, now, 0.016); this.hat(ctx, now + sixteenth * 2, 0.011); this.hat(ctx, now + eighth, 0.016); this.hat(ctx, now + sixteenth * 3, 0.022);
        if (beat === 1) { this.kick808(ctx, now, 0.26); this.kick808(ctx, now + sixteenth * 3, 0.09); }
        if (beat === 2 || beat === 4) this.clap(ctx, now, 0.09);
        if (beat === 3) this.kick808(ctx, now + sixteenth, 0.18);
        return;
      case "neo-soul":
        this.hat(ctx, now, 0.017); this.hat(ctx, now + eighth, 0.012, beat === 4); this.rim(ctx, now + sixteenth * 2, 0.018);
        if (beat === 1) this.kick(ctx, now, 0.16);
        if (beat === 2 || beat === 4) this.snare(ctx, now, 0.08);
        if (beat === 3) { this.kick(ctx, now + sixteenth, 0.11); this.playNoise(ctx, now - 0.01, 0.02, 0.018, 1800, 1400); }
        return;
      case "latin-pop":
        this.hat(ctx, now, 0.02); this.hat(ctx, now + eighth, 0.02, true);
        if (beat === 1 || beat === 3) this.kick(ctx, now, 0.17);
        if (beat === 2 || beat === 4) this.rim(ctx, now, 0.055);
        if (beat === 4) this.snare(ctx, now + eighth, 0.05);
        return;
      default:
        this.hat(ctx, now, 0.02); this.hat(ctx, now + eighth, 0.015, beat === 4);
        if (beat === 1) { this.kick(ctx, now, 0.2); this.kick808(ctx, now + eighth, 0.08); }
        if (beat === 2 || beat === 4) this.snare(ctx, now, 0.1);
        if (beat === 3) { this.tom(ctx, now + sixteenth, 130, 0.07); this.kick(ctx, now + eighth, 0.08); }
    }
  }
}
