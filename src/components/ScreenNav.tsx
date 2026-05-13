import type { Screen } from "../types";

export function ScreenNav({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  return (
    <div className="button-row">
      {(["setup", "playback", "settings", "progress"] as Screen[]).map((s, i) => (
        <button key={s} onClick={() => setScreen(s)} className={`pill ${screen === s ? "pill-active" : ""}`}>
          {i + 1}. {s[0].toUpperCase() + s.slice(1)}
        </button>
      ))}
    </div>
  );
}
