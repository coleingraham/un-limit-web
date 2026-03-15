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
 */
export function useVoiceManager(callbacks: VoiceCallbacks) {
  const voiceMapRef = useRef<Map<number, number>>(new Map()); // pointerId → voiceId

  const computeCutoff = useCallback((freq: number, timbre: number): number => {
    // Timbre 0.0 = 1 octave above fundamental, 1.0 = 4 octaves above
    const octaves = 1 + timbre * 3;
    return freq * Math.pow(2, octaves);
  }, []);

  const onTouchStart = useCallback(async (touch: TouchState) => {
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
  }, [callbacks, computeCutoff]);

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
    const voiceId = voiceMapRef.current.get(pointerId);
    if (voiceId == null) return;

    callbacks.setGate(voiceId, 0);
    // Free after a short delay to let the release tail play
    setTimeout(() => {
      callbacks.freeVoice(voiceId);
    }, 500);
    voiceMapRef.current.delete(pointerId);
  }, [callbacks]);

  const getActiveVoices = useCallback((): Map<number, number> => {
    return voiceMapRef.current;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd, getActiveVoices };
}
