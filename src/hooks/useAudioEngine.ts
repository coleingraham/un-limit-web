import { useCallback, useEffect, useRef, useState } from 'react';
import { MicrosynthEngine } from '../utils/MicrosynthEngine.ts';
import { DEFAULT_INSTRUMENT_DEF, DEFAULT_MASTER_EFFECT_DEF } from '../utils/synthDefs.ts';

// Module-level singleton — survives re-renders and route changes
let sharedEngine: MicrosynthEngine | null = null;
let sharedInitPromise: Promise<void> | null = null;
const masterState = { gain: 0.5, timbre: 0.5 };

async function getOrInitEngine(): Promise<MicrosynthEngine> {
  if (sharedEngine?.isReady()) {
    await sharedEngine.resume();
    return sharedEngine;
  }

  if (sharedInitPromise) {
    await sharedInitPromise;
    return sharedEngine!;
  }

  sharedEngine = new MicrosynthEngine();
  sharedInitPromise = (async () => {
    await sharedEngine!.init();
    await sharedEngine!.registerDef('unlimit', DEFAULT_INSTRUMENT_DEF);
    await sharedEngine!.registerDef('master', DEFAULT_MASTER_EFFECT_DEF);
  })();

  try {
    await sharedInitPromise;
  } catch (err) {
    sharedEngine = null;
    sharedInitPromise = null;
    throw err;
  }

  return sharedEngine;
}

export function useAudioEngine() {
  const [initialized, setInitialized] = useState(sharedEngine?.isReady() ?? false);
  const initCalledRef = useRef(false);

  const initEngine = useCallback(async () => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    try {
      await getOrInitEngine();
      setInitialized(true);
    } catch (err) {
      initCalledRef.current = false;
      console.error('[useAudioEngine] Init failed:', err);
    }
  }, []);

  const reloadSynthDefs = useCallback(async (instrumentSource: string, masterSource: string) => {
    if (!sharedEngine?.isReady()) return;
    sharedEngine.clearRegisteredDefs();
    await sharedEngine.registerDef('unlimit', instrumentSource);
    await sharedEngine.registerDef('master', masterSource);
  }, []);

  const spawnVoice = useCallback(async (): Promise<number> => {
    if (!sharedEngine?.isReady()) return 0;
    return sharedEngine.spawnVoice('unlimit');
  }, []);

  const setParam = useCallback((voiceId: number, param: string, value: number) => {
    sharedEngine?.setParam(voiceId, param, value);
  }, []);

  const setGate = useCallback((voiceId: number, value: number) => {
    sharedEngine?.setGate(voiceId, value);
  }, []);

  const freeVoice = useCallback((voiceId: number) => {
    sharedEngine?.freeVoice(voiceId);
  }, []);

  const setMasterGain = useCallback((value: number) => {
    masterState.gain = value;
  }, []);

  const setMasterTimbre = useCallback((value: number) => {
    masterState.timbre = value;
  }, []);

  const getMasterGain = useCallback(() => masterState.gain, []);
  const getMasterTimbre = useCallback(() => masterState.timbre, []);

  useEffect(() => {
    if (sharedEngine?.isReady()) setInitialized(true);
  }, []);

  return {
    initialized,
    initEngine,
    reloadSynthDefs,
    spawnVoice,
    setParam,
    setGate,
    freeVoice,
    setMasterGain,
    setMasterTimbre,
    getMasterGain,
    getMasterTimbre,
  };
}
