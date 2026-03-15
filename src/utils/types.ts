export interface TouchState {
  pointerId: number;
  stringIndex: number;
  x: number;
  y: number;
  frequency: number;
  amplitude: number;
  voiceId: number | null;
}

export interface StringConfig {
  index: number;
  fundamentalFreq: number;
  yTop: number;
  yBottom: number;
  color: string;
}

export interface TuningGuide {
  ratio: [number, number];
  label: string;
}

export interface InstrumentConfig {
  stringRatio: [number, number];
  fundamentalFreq: number;
  numStrings: number;
  freqRangeOctaves: number;
  tuningGuides: TuningGuide[];
  monoMode: boolean;
}

export const DEFAULT_CONFIG: InstrumentConfig = {
  stringRatio: [4, 3],
  fundamentalFreq: 55,
  numStrings: 4,
  freqRangeOctaves: 4,
  tuningGuides: [
    { ratio: [3, 2], label: '3:2' },
    { ratio: [4, 3], label: '4:3' },
    { ratio: [5, 4], label: '5:4' },
    { ratio: [7, 4], label: '7:4' },
  ],
  monoMode: false,
};
