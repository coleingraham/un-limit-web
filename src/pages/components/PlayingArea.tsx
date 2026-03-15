import { useRef, useEffect, useCallback } from 'react';
import type { StringConfig, TouchState, TuningGuide } from '../../utils/types.ts';
import { drawStrings, drawTouchIndicators } from './VirtualStringRenderer.ts';
import { drawTuningGuides } from './TuningGuideRenderer.ts';

interface PlayingAreaProps {
  strings: StringConfig[];
  rangeOctaves: number;
  tuningGuides: TuningGuide[];
  stringRatio: [number, number];
  touches: Map<number, TouchState>;
  getAnalyser: () => AnalyserNode | null;
  onPointerDown: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLCanvasElement>) => void;
}

export default function PlayingArea({
  strings,
  rangeOctaves,
  tuningGuides,
  stringRatio,
  touches,
  getAnalyser,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PlayingAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const waveformDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match display size
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw waveform behind strings
    const analyser = getAnalyser();
    if (analyser) {
      if (!waveformDataRef.current || waveformDataRef.current.length !== analyser.frequencyBinCount) {
        waveformDataRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      }
      analyser.getByteTimeDomainData(waveformDataRef.current);
      drawWaveform(ctx, waveformDataRef.current, canvas.width, canvas.height);
    }

    // Draw strings with 12-TET indicators
    drawStrings(ctx, strings, canvas.width, rangeOctaves);

    // Draw tuning guides
    drawTuningGuides(
      ctx,
      touches,
      tuningGuides,
      strings,
      stringRatio,
      canvas.width,
      canvas.height,
      rangeOctaves,
    );

    // Draw touch indicators
    drawTouchIndicators(ctx, touches, strings);

    animFrameRef.current = requestAnimationFrame(draw);
  }, [strings, rangeOctaves, tuningGuides, stringRatio, touches, getAnalyser]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  width: number,
  height: number,
) {
  // Check if there's any signal (not just silence at 128)
  let hasSignal = false;
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i] - 128) > 1) {
      hasSignal = true;
      break;
    }
  }
  if (!hasSignal) return;

  const sliceWidth = width / data.length;

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
  ctx.lineWidth = 2;

  for (let i = 0; i < data.length; i++) {
    const v = data[i] / 255;
    const x = i * sliceWidth;
    const y = v * height;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
}
