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
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: PlayingAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

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
  }, [strings, rangeOctaves, tuningGuides, stringRatio, touches]);

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
