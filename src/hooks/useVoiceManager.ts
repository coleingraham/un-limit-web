import { useRef, useCallback } from 'react';
import type { TouchState } from '../utils/types.ts';

interface VoiceCallbacks {
  spawnVoice: () => Promise<number>;
  setParam: (voiceId: number, param: string, value: number) => void;
  setGate: (voiceId: number, value: number) => void;
  freeVoice: (voiceId: number) => void;
  getMasterGain: () => number;
  getMasterTimbre: () => number;
}

/**
 * Bridges touch state to the audio engine.
 * Spawns voices on touch, updates params on move, releases on end.
 * In mono mode, each string plays at most one voice — new touches steal.
 */
export function useVoiceManager(callbacks: VoiceCallbacks, monoMode: boolean) {
  const voiceMapRef = useRef<Map<number, number>>(new Map()); // pointerId → voiceId
  // In mono mode, track which pointerId owns each string
  const stringOwnerRef = useRef<Map<number, number>>(new Map()); // stringIndex → pointerId

  const computeCutoff = useCallback((freq: number, timbre: number): number => {
    // Timbre 0.0 = 1 octave above fundamental, 1.0 = 4 octaves above
    const octaves = 1 + timbre * 3;
    return freq * Math.pow(2, octaves);
  }, []);

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
      // If another touch already owns this string, steal it
      const currentOwner = stringOwnerRef.current.get(touch.stringIndex);
      if (currentOwner != null && currentOwner !== touch.pointerId) {
        releaseVoice(currentOwner);
        stringOwnerRef.current.delete(touch.stringIndex);
      }
      stringOwnerRef.current.set(touch.stringIndex, touch.pointerId);
    }

    const voiceId = await callbacks.spawnVoice();
    if (voiceId === 0) return;

    voiceMapRef.current.set(touch.pointerId, voiceId);

    const masterGain = callbacks.getMasterGain();
    const timbre = callbacks.getMasterTimbre();

    callbacks.setParam(voiceId, 'freq', touch.frequency);
    callbacks.setParam(voiceId, 'amp', touch.amplitude * masterGain);
    callbacks.setParam(voiceId, 'cutoff', computeCutoff(touch.frequency, timbre));
    callbacks.setGate(voiceId, 1);

    return voiceId;
  }, [callbacks, computeCutoff, monoMode, releaseVoice]);

  const onTouchMove = useCallback((touch: TouchState) => {
    const voiceId = voiceMapRef.current.get(touch.pointerId);
    if (voiceId == null) return;

    const masterGain = callbacks.getMasterGain();
    const timbre = callbacks.getMasterTimbre();

    callbacks.setParam(voiceId, 'freq', touch.frequency);
    callbacks.setParam(voiceId, 'amp', touch.amplitude * masterGain);
    callbacks.setParam(voiceId, 'cutoff', computeCutoff(touch.frequency, timbre));
  }, [callbacks, computeCutoff]);

  const onTouchEnd = useCallback((pointerId: number) => {
    // Clean up string ownership
    for (const [strIdx, owner] of stringOwnerRef.current) {
      if (owner === pointerId) {
        stringOwnerRef.current.delete(strIdx);
        break;
      }
    }
    releaseVoice(pointerId);
  }, [releaseVoice]);

  const getActiveVoices = useCallback((): Map<number, number> => {
    return voiceMapRef.current;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, getActiveVoices };
}
