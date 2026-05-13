import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioEngine } from "../src/audio/engine";
import type { MixerState } from "../src/types";

class FakeAudioParam {
  value = 0;
  setValueAtTime(v: number) { this.value = v; }
  exponentialRampToValueAtTime(v: number) { this.value = v; }
  cancelScheduledValues() {}
}

class FakeNode {
  connections: unknown[] = [];
  connect(node: unknown) { this.connections.push(node); return node; }
}

class FakeGainNode extends FakeNode { gain = new FakeAudioParam(); }
class FakeOscillatorNode extends FakeNode { type: OscillatorType = "sine"; frequency = new FakeAudioParam(); detune = new FakeAudioParam(); start = vi.fn(); stop = vi.fn(); }
class FakeBiquadFilterNode extends FakeNode { type: BiquadFilterType = "lowpass"; frequency = new FakeAudioParam(); Q = new FakeAudioParam(); }
class FakeBufferSourceNode extends FakeNode { buffer: unknown = null; start = vi.fn(); stop = vi.fn(); }
class FakeBuffer { constructor(public length: number) {} getChannelData() { return new Float32Array(this.length); } }
class FakeAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  sampleRate = 44100;
  destination = new FakeNode();
  resume = vi.fn(async () => {});
  createGain() { return new FakeGainNode() as unknown as GainNode; }
  createOscillator() { return new FakeOscillatorNode() as unknown as OscillatorNode; }
  createBiquadFilter() { return new FakeBiquadFilterNode() as unknown as BiquadFilterNode; }
  createBuffer(channels: number, length: number) { return new FakeBuffer(length) as unknown as AudioBuffer; }
  createBufferSource() { return new FakeBufferSourceNode() as unknown as AudioBufferSourceNode; }
}

describe("AudioEngine", () => {
  beforeEach(() => {
    // @ts-expect-error test stub
    globalThis.AudioContext = FakeAudioContext;
  });

  it("applies mixer settings without throwing", async () => {
    const engine = new AudioEngine();
    const mixer: MixerState = { click: 0.5, drums: 0.4, chords: 0.3, mute: { click: false, drums: false, chords: false }, solo: { click: false, drums: false, chords: false } };
    await expect(engine.setMixer(mixer)).resolves.toBeUndefined();
  });

  it("plays click, chord, and drum events without throwing", async () => {
    const engine = new AudioEngine();
    await expect(engine.click(true)).resolves.toBeUndefined();
    await expect(engine.chord(["G", "B", "D"], 1.5, "rock-guitar")).resolves.toBeUndefined();
    await expect(engine.drum("rock", 1, 0.5)).resolves.toBeUndefined();
    expect(() => engine.stopChords()).not.toThrow();
  });
});
