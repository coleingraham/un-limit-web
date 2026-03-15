import { useRef, useCallback } from 'react';
import type { TouchState } from '../utils/types.ts';

interface VoiceCallbacks {
  spawnVoice: () => Promise<number>;
  setParam: (voiceId: number, param: string, value: number) => void;
  setGate: (voiceId: number, value: number) => void;
  freeVoice: (voiceId: number) => void;
  getMasterGain: () => number;
  getMasterTimbre: () => number;
  getTouches: () => Map<number, TouchState>;
}

/**
 * Bridges touch state to the audio engine.
 * Spawns voices on touch, updates params on move, releases on end.
 * In mono mode, each string plays at most one voice — new touches steal,
 * and releasing the newest touch restores the previous one on that string.
 */
export function useVoiceManager(callbacks: VoiceCallbacks, monoMode: boolean) {
  const voiceMapRef = useRef<Map<number, number>>(new Map()); // pointerId → voiceId
  // In mono mode, track a stack of pointerIds per string (most recent last)
  const stringStackRef = useRef<Map<number, number[]>>(new Map()); // stringIndex → [pointerId, ...]

  const computeCutoff = useCallback((freq: number, timbre: number): number => {
    // Timbre 0.0 = 1 octave above fundamental, 1.0 = 4 octaves above
    const octaves = 1 + timbre * 3;
    return freq * Math.pow(2, octaves);
  }, []);

  const updateVoiceParams = useCallback((voiceId: number, touch: TouchState) => {
    const masterGain = callbacks.getMasterGain();
    const timbre = callbacks.getMasterTimbre();
    callbacks.setParam(voiceId, 'freq', touch.frequency);
    callbacks.setParam(voiceId, 'amp', touch.amplitude * masterGain);
    callbacks.setParam(voiceId, 'cutoff', computeCutoff(touch.frequency, timbre));
  }, [callbacks, computeCutoff]);

  const releaseVoice = useCallback((pointerId: number) => {
    const voiceId = voiceMapRef.current.get(pointerId);
    if (voiceId == null) return;
    callbacks.setGate(voiceId, 0);
    const vid = voiceId;
    setTimeout(() => callbacks.freeVoice(vid), 500);
    voiceMapRef.current.delete(pointerId);
  }, [callbacks]);

  const onTouchStart = useCallback(async (touch: TouchState) => {
    if (monoMode) {
      const stack = stringStackRef.current.get(touch.stringIndex) ?? [];

      // If there's already a voice on this string, reuse it (update params, no new spawn)
      if (stack.length > 0) {
        const previousOwner = stack[stack.length - 1];
        const existingVoiceId = voiceMapRef.current.get(previousOwner);
        if (existingVoiceId != null) {
          // Transfer voice ownership to new touch
          voiceMapRef.current.delete(previousOwner);
          voiceMapRef.current.set(touch.pointerId, existingVoiceId);
          updateVoiceParams(existingVoiceId, touch);
          stack.push(touch.pointerId);
          stringStackRef.current.set(touch.stringIndex, stack);
          return existingVoiceId;
        }
      }

      // No existing voice — spawn fresh
      stack.push(touch.pointerId);
      stringStackRef.current.set(touch.stringIndex, stack);

      const voiceId = await callbacks.spawnVoice();
      if (voiceId === 0) return;
      voiceMapRef.current.set(touch.pointerId, voiceId);
      updateVoiceParams(voiceId, touch);
      callbacks.setGate(voiceId, 1);
      return voiceId;
    }

    // Poly mode — just spawn a new voice
    const voiceId = await callbacks.spawnVoice();
    if (voiceId === 0) return;

    voiceMapRef.current.set(touch.pointerId, voiceId);
    updateVoiceParams(voiceId, touch);
    callbacks.setGate(voiceId, 1);

    return voiceId;
  }, [callbacks, computeCutoff, monoMode, updateVoiceParams]);

  const onTouchMove = useCallback((touch: TouchState) => {
    const voiceId = voiceMapRef.current.get(touch.pointerId);
    if (voiceId == null) return;
    updateVoiceParams(voiceId, touch);
  }, [updateVoiceParams]);

  const onTouchEnd = useCallback((pointerId: number) => {
    if (monoMode) {
      // Find which string this pointer was on and remove from stack
      for (const [strIdx, stack] of stringStackRef.current) {
        const idx = stack.indexOf(pointerId);
        if (idx === -1) continue;

        const wasTop = idx === stack.length - 1;
        stack.splice(idx, 1);

        if (stack.length === 0) {
          stringStackRef.current.delete(strIdx);
          // No more touches on this string — release the voice
          releaseVoice(pointerId);
        } else if (wasTop) {
          // The top touch was removed — restore previous touch
          const restoredPointerId = stack[stack.length - 1];
          const voiceId = voiceMapRef.current.get(pointerId);
          if (voiceId != null) {
            // Transfer voice back to restored touch
            voiceMapRef.current.delete(pointerId);
            voiceMapRef.current.set(restoredPointerId, voiceId);
            // Update params to match restored touch's current position
            const touches = callbacks.getTouches();
            const restoredTouch = touches.get(restoredPointerId);
            if (restoredTouch) {
              updateVoiceParams(voiceId, restoredTouch);
            }
          }
        } else {
          // A non-top touch was removed — voice stays with current top, just clean up
          voiceMapRef.current.delete(pointerId);
        }
        return;
      }
      // Pointer not found in any stack — just release
      releaseVoice(pointerId);
      return;
    }

    // Poly mode
    releaseVoice(pointerId);
  }, [callbacks, monoMode, releaseVoice, updateVoiceParams]);

  const getActiveVoices = useCallback((): Map<number, number> => {
    return voiceMapRef.current;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, getActiveVoices };
}
