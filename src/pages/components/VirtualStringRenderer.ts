import type { StringConfig, TouchState } from '../../utils/types.ts';
import { get12TETPositions } from '../../utils/tuning.ts';

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function drawStrings(
  ctx: CanvasRenderingContext2D,
  strings: StringConfig[],
  canvasWidth: number,
  rangeOctaves: number,
) {
  for (const str of strings) {
    // String background: gradient from black at edges to color at center
    // Semi-transparent so waveform shows through
    const gradient = ctx.createLinearGradient(0, str.yTop, 0, str.yBottom);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(0.5, hexToRgba(str.color, 0.3));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, str.yTop, canvasWidth, str.yBottom - str.yTop);

    // String boundary lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, str.yTop);
    ctx.lineTo(canvasWidth, str.yTop);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, str.yBottom);
    ctx.lineTo(canvasWidth, str.yBottom);
    ctx.stroke();

    // 12-TET indicators
    const positions = get12TETPositions(str.fundamentalFreq, rangeOctaves);
    for (const pos of positions) {
      const x = pos.x * canvasWidth;
      const isC = pos.midiNote % 12 === 0;
      if (isC) {
        ctx.strokeStyle = 'rgba(255, 60, 60, 0.5)';
        ctx.lineWidth = 2;
      } else if (pos.isWhiteKey) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.75;
      }
      ctx.beginPath();
      ctx.moveTo(x, str.yTop);
      ctx.lineTo(x, str.yBottom);
      ctx.stroke();
    }
  }
}

export function drawTouchIndicators(
  ctx: CanvasRenderingContext2D,
  touches: Map<number, TouchState>,
  strings: StringConfig[],
) {
  for (const touch of touches.values()) {
    const str = strings.find((s) => s.index === touch.stringIndex);
    if (!str) continue;

    const radius = 20 + touch.amplitude * 20;

    // Gradient circle
    const gradient = ctx.createRadialGradient(
      touch.x, touch.y, 0,
      touch.x, touch.y, radius,
    );
    gradient.addColorStop(0, `rgba(255, 200, 100, ${0.3 + touch.amplitude * 0.5})`);
    gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(touch.x, touch.y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Center dot
    ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + touch.amplitude * 0.5})`;
    ctx.beginPath();
    ctx.arc(touch.x, touch.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
