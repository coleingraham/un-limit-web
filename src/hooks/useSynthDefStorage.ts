import { useState, useCallback } from 'react';
import { DEFAULT_INSTRUMENT_DEF, DEFAULT_MASTER_EFFECT_DEF } from '../utils/synthDefs.ts';

const INSTRUMENT_KEY = 'unlimit-synthdef-instrument';
const MASTER_KEY = 'unlimit-synthdef-master';

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string) {
  const encoded = encodeURIComponent(value);
  document.cookie = `${name}=${encoded}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Strict`;
}

export function useSynthDefStorage() {
  const [instrumentSource, setInstrumentSource] = useState(() =>
    getCookie(INSTRUMENT_KEY) ?? DEFAULT_INSTRUMENT_DEF
  );
  const [masterSource, setMasterSource] = useState(() =>
    getCookie(MASTER_KEY) ?? DEFAULT_MASTER_EFFECT_DEF
  );

  const saveInstrument = useCallback((source: string) => {
    setInstrumentSource(source);
    setCookie(INSTRUMENT_KEY, source);
  }, []);

  const saveMaster = useCallback((source: string) => {
    setMasterSource(source);
    setCookie(MASTER_KEY, source);
  }, []);

  const resetToDefaults = useCallback(() => {
    saveInstrument(DEFAULT_INSTRUMENT_DEF);
    saveMaster(DEFAULT_MASTER_EFFECT_DEF);
  }, [saveInstrument, saveMaster]);

  return {
    instrumentSource,
    masterSource,
    saveInstrument,
    saveMaster,
    resetToDefaults,
  };
}
