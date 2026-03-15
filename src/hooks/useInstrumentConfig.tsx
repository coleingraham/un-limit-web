import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { DEFAULT_CONFIG, type InstrumentConfig, type TuningGuide } from '../utils/types.ts';

const STORAGE_KEY = 'unlimit-config';

function loadConfig(): InstrumentConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as InstrumentConfig;
  } catch { /* use default */ }
  return DEFAULT_CONFIG;
}

function saveConfig(config: InstrumentConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

interface InstrumentConfigContextType {
  config: InstrumentConfig;
  setStringRatio: (ratio: [number, number]) => void;
  setFundamentalFreq: (freq: number) => void;
  setNumStrings: (n: number) => void;
  setFreqRangeOctaves: (octaves: number) => void;
  setMonoMode: (mono: boolean) => void;
  addTuningGuide: (guide: TuningGuide) => void;
  removeTuningGuide: (index: number) => void;
  resetToDefaults: () => void;
}

const InstrumentConfigContext = createContext<InstrumentConfigContextType | null>(null);

export function InstrumentConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<InstrumentConfig>(loadConfig);

  const update = useCallback((partial: Partial<InstrumentConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  const setStringRatio = useCallback((ratio: [number, number]) => update({ stringRatio: ratio }), [update]);
  const setFundamentalFreq = useCallback((freq: number) => update({ fundamentalFreq: freq }), [update]);
  const setNumStrings = useCallback((n: number) => update({ numStrings: n }), [update]);
  const setFreqRangeOctaves = useCallback((octaves: number) => update({ freqRangeOctaves: octaves }), [update]);
  const setMonoMode = useCallback((mono: boolean) => update({ monoMode: mono }), [update]);

  const addTuningGuide = useCallback((guide: TuningGuide) => {
    setConfig((prev) => {
      const next = { ...prev, tuningGuides: [...prev.tuningGuides, guide] };
      saveConfig(next);
      return next;
    });
  }, []);

  const removeTuningGuide = useCallback((index: number) => {
    setConfig((prev) => {
      const next = { ...prev, tuningGuides: prev.tuningGuides.filter((_, i) => i !== index) };
      saveConfig(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    saveConfig(DEFAULT_CONFIG);
  }, []);

  return (
    <InstrumentConfigContext.Provider value={{
      config,
      setStringRatio,
      setFundamentalFreq,
      setNumStrings,
      setFreqRangeOctaves,
      setMonoMode,
      addTuningGuide,
      removeTuningGuide,
      resetToDefaults,
    }}>
      {children}
    </InstrumentConfigContext.Provider>
  );
}

export function useInstrumentConfig(): InstrumentConfigContextType {
  const ctx = useContext(InstrumentConfigContext);
  if (!ctx) throw new Error('useInstrumentConfig must be used within InstrumentConfigProvider');
  return ctx;
}
