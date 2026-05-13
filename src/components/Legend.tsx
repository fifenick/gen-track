export function Legend({ introCount, groove }: { introCount: number; groove: string }) {
  return (
    <div className="legend-grid">
      <div className="legend-card"><span className="swatch swatch-root" />Root</div>
      <div className="legend-card"><span className="swatch swatch-third" />3rd</div>
      <div className="legend-card"><span className="swatch swatch-fifth" />5th</div>
      <div className="legend-card"><span className="swatch swatch-target" />Target</div>
      <div className="legend-card"><span className="swatch swatch-primary" />Primary triangle</div>
      <div className="legend-card"><span className="swatch swatch-alt" />Alternative triangle</div>
      <div className="legend-card">Intro: <strong>{introCount === 0 ? "off" : `${introCount} bar${introCount === 1 ? "" : "s"}`}</strong></div>
      <div className="legend-card">Groove: <strong>{groove}</strong></div>
    </div>
  );
}
