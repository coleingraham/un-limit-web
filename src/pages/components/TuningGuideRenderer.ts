import type { TouchState, TuningGuide, StringConfig } from '../../utils/types.ts';
import { getRatioDetuning } from '../../utils/tuningGuides.ts';

export function drawTuningGuides(
  ctx: CanvasRenderingContext2D,
  touches: Map<number, TouchState>,
  guides: TuningGuide[],
  strings: StringConfig[],
  stringRatio: [number, number],
  canvasWidth: number,
  canvasHeight: number,
  rangeOctaves: number,
) {
  const touchArray = [...touches.values()];
  if (touchArray.length === 0 || strings.length === 0) return;

  const stringLog = Math.log2(stringRatio[0] / stringRatio[1]);

  for (const touch of touchArray) {
    const touchStr = strings.find((s) => s.index === touch.stringIndex);
    if (!touchStr) continue;

    const touchXNorm = touch.x / canvasWidth;
    for (const guide of guides) {
      const guideLog = Math.log2(guide.ratio[0] / guide.ratio[1]);

      // Find closest detuning from any other touch to this guide ratio.
      // brightness ramps up as detuning approaches 0 (perfect tune).
      const glowRange = 50; // cents — guides start brightening within this range
      let closestCents = Infinity;
      for (const other of touchArray) {
        if (other.pointerId === touch.pointerId) continue;
        const cents = getRatioDetuning(touch.frequency, other.frequency, guide.ratio);
        if (cents < closestCents) closestCents = cents;
      }
      // 0 = no glow, 1 = fully in tune
      const glow = closestCents < glowRange
        ? 1 - closestCents / glowRange
        : 0;

      // Compute intersection x on every string (including the touch string)
      // and draw a continuous line across the full canvas height
      const points: { x: number; y: number }[] = [];

      for (const str of strings) {
        const stringDiff = str.index - touch.stringIndex;
        const xOffsetNorm = (guideLog * stringDiff - stringDiff * stringLog) / rangeOctaves;
        const intersectXNorm = touchXNorm + xOffsetNorm;
        const intersectX = intersectXNorm * canvasWidth;
        const strMidY = (str.yTop + str.yBottom) / 2;
        points.push({ x: intersectX, y: strMidY });
      }

      // Sort by y so the line goes top to bottom
      points.sort((a, b) => a.y - b.y);

      if (points.length < 2) continue;

      // Extrapolate beyond the top and bottom strings to cover full canvas
      const top = points[0];
      const second = points[1];
      const bottom = points[points.length - 1];
      const secondLast = points[points.length - 2];

      // Slope from the top two points
      const dyTop = second.y - top.y;
      const dxTop = second.x - top.x;
      if (dyTop !== 0) {
        const extY = 0;
        const extX = top.x - dxTop / dyTop * top.y;
        points.unshift({ x: extX, y: extY });
      }

      // Slope from the bottom two points
      const dyBot = bottom.y - secondLast.y;
      const dxBot = bottom.x - secondLast.x;
      if (dyBot !== 0) {
        const extY = canvasHeight;
        const extX = bottom.x + dxBot / dyBot * (canvasHeight - bottom.y);
        points.push({ x: extX, y: extY });
      }

      // Draw the guide line — brightness scales with glow (0..1)
      if (glow > 0) {
        const alpha = 0.12 + 0.48 * glow;
        const blur = 12 * glow;
        ctx.shadowColor = `rgba(100, 200, 255, ${(0.8 * glow).toFixed(2)})`;
        ctx.shadowBlur = blur;
        ctx.strokeStyle = `rgba(100, 200, 255, ${alpha.toFixed(2)})`;
        ctx.lineWidth = 1 + 1.5 * glow;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      // Draw markers at string intersections (skip extrapolated endpoints)
      const markerStart = dyTop !== 0 ? 1 : 0;
      const markerEnd = dyBot !== 0 ? points.length - 1 : points.length;
      for (let i = markerStart; i < markerEnd; i++) {
        const p = points[i];
        if (p.x < 0 || p.x > canvasWidth) continue;
        const markerAlpha = glow > 0 ? 0.15 + 0.35 * glow : 0.15;
        ctx.fillStyle = glow > 0
          ? `rgba(100, 200, 255, ${markerAlpha.toFixed(2)})`
          : 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 + 2 * glow, 0, Math.PI * 2);
        ctx.fill();
      }

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }
}
