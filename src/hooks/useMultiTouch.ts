import { useRef, useCallback } from 'react';
import type { TouchState, StringConfig } from '../utils/types.ts';
import { xToFrequency, yToAmplitudeDb } from '../utils/tuning.ts';

interface UseMultiTouchProps {
  strings: StringConfig[];
  rangeOctaves: number;
  onTouchStart: (touch: TouchState) => void;
  onTouchMove: (touch: TouchState) => void;
  onTouchEnd: (pointerId: number) => void;
}

export function useMultiTouch({
  strings,
  rangeOctaves,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: UseMultiTouchProps) {
  const touchesRef = useRef<Map<number, TouchState>>(new Map());

  const findString = useCallback((y: number): StringConfig | null => {
    for (const str of strings) {
      if (y >= str.yTop && y < str.yBottom) return str;
    }
    return null;
  }, [strings]);

  const buildTouchState = useCallback((
    pointerId: number,
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement,
  ): TouchState | null => {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const str = findString(y);
    if (!str) return null;

    const xNorm = x / rect.width;
    const yNorm = 1 - (y - str.yTop) / (str.yBottom - str.yTop); // invert: top=1

    const frequency = xToFrequency(xNorm, str.fundamentalFreq, rangeOctaves);
    const amplitude = yToAmplitudeDb(yNorm);

    return {
      pointerId,
      stringIndex: str.index,
      x,
      y,
      frequency,
      amplitude,
      voiceId: null,
    };
  }, [findString, rangeOctaves]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);

    const touch = buildTouchState(e.pointerId, e.clientX, e.clientY, canvas);
    if (!touch) return;

    touchesRef.current.set(e.pointerId, touch);
    onTouchStart(touch);
  }, [buildTouchState, onTouchStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const existing = touchesRef.current.get(e.pointerId);
    if (!existing) return;

    const canvas = e.currentTarget;
    const touch = buildTouchState(e.pointerId, e.clientX, e.clientY, canvas);
    if (!touch) return;

    touch.voiceId = existing.voiceId;
    touchesRef.current.set(e.pointerId, touch);
    onTouchMove(touch);
  }, [buildTouchState, onTouchMove]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    touchesRef.current.delete(e.pointerId);
    onTouchEnd(e.pointerId);
  }, [onTouchEnd]);

  const setVoiceId = useCallback((pointerId: number, voiceId: number) => {
    const touch = touchesRef.current.get(pointerId);
    if (touch) {
      touch.voiceId = voiceId;
    }
  }, []);

  const getTouches = useCallback((): Map<number, TouchState> => {
    return touchesRef.current;
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel: handlePointerUp,
    setVoiceId,
    getTouches,
  };
}
