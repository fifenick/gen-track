import type { OverlayMode, TriangleShape } from "../types";
import { pointCoords } from "../lib/triangles";

export function TriangleOverlay({ shapes, overlayMode, width, height, fretWidth }: { shapes: TriangleShape[]; overlayMode: OverlayMode; width: number; height: number; fretWidth: number }) {
  const fill = overlayMode === "primary" ? "rgba(245,158,11,.10)" : "rgba(139,92,246,.10)";
  const stroke = overlayMode === "primary" ? "rgba(245,158,11,.95)" : "rgba(139,92,246,.95)";
  return (
    <svg className="overlay-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {shapes.map((shape) => {
        const r = pointCoords(shape.root, fretWidth), t = pointCoords(shape.third, fretWidth), f = pointCoords(shape.fifth, fretWidth);
        return <polygon key={shape.id} points={`${r.x},${r.y} ${t.x},${t.y} ${f.x},${f.y}`} fill={fill} stroke={stroke} strokeWidth="4" strokeLinejoin="round" />;
      })}
    </svg>
  );
}
