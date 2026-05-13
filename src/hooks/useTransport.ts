import { useEffect, useRef } from "react";
import type { Phase } from "../types";

type Args = {
  phase: Phase;
  tempo: number;
  introCount: number;
  chordCount: number;
  currentChordIndex: number;
  getBarsForChord: (index: number) => number;
  loopEnabled: boolean;
  onCountInBeat: (updater: (prev: number) => number) => void;
  onBeat: (updater: (prev: number) => number) => void;
  onChordIndex: (updater: (prev: number) => number) => void;
  setPhase: (phase: Phase) => void;
  resetSequence: () => void;
  onTick?: (beat: number, isCountIn: boolean) => void;
};

export function useTransport(args: Args) {
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (args.phase === "stopped" || args.chordCount === 0) return;
    const ms = (60 / args.tempo) * 1000;
    const introBeats = args.introCount * 4;
    timerRef.current = window.setInterval(() => {
      if (args.phase === "count-in") {
        args.onCountInBeat((b) => {
          args.onTick?.(Math.max(1, b), true);
          if (b < introBeats) return b + 1;
          args.setPhase("sequence");
          args.resetSequence();
          return b;
        });
        return;
      }
      args.onBeat((b) => {
        args.onTick?.(b, false);
        const barsForChord = Math.max(1, args.getBarsForChord(args.currentChordIndex));
        if (b < 4 * barsForChord) return b + 1;
        args.onChordIndex((i) => {
          const next = i + 1;
          return next >= args.chordCount ? (args.loopEnabled ? 0 : i) : next;
        });
        return 1;
      });
    }, ms) as unknown as number;
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [args]);
}
