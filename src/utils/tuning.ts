import type { StringConfig, InstrumentConfig } from './types.ts';

export function ratioToCents(numerator: number, denominator: number): number {
  return 1200 * Math.log2(numerator / denominator);
}

export function centsToFreq(baseCents: number, cents: number): number {
  return baseCents * Math.pow(2, cents / 1200);
}

/**
 * Convert x position (0..1 within a string) to frequency.
 * Logarithmic mapping over the configured octave range.
 */
export function xToFrequency(
  xNorm: number,
  stringFundamental: number,
  rangeOctaves: number,
): number {
  return stringFundamental * Math.pow(2, xNorm * rangeOctaves);
}

/**
 * Convert frequency back to x position (0..1).
 */
export function frequencyToX(
  freq: number,
  stringFundamental: number,
  rangeOctaves: number,
): number {
  return Math.log2(freq / stringFundamental) / rangeOctaves;
}

/**
 * Convert y position within a string to amplitude using dB scale.
 * Center of string = 0 dB (full volume), edges = -inf dB (silent).
 * Buffer zones near edges prevent accidental string changes.
 */
export function yToAmplitudeDb(yNorm: number): number {
  const bufferZone = 0.05;

  // In buffer zones near edges, silent
  if (yNorm <= bufferZone || yNorm >= 1 - bufferZone) return 0;

  // Distance from center: 0 at center, 1 at edge of buffer zone
  const distFromCenter = Math.abs(yNorm - 0.5) / (0.5 - bufferZone);

  // dB scale: center = 0 dB, edge = -60 dB
  const minDb = -60;
  const db = minDb * distFromCenter;
  return Math.pow(10, db / 20);
}

/**
 * Get x positions (0..1) for 12-TET note positions across the string range.
 * Returns [{x, isWhiteKey, noteName}].
 */
export function get12TETPositions(
  stringFundamental: number,
  rangeOctaves: number,
): { x: number; isWhiteKey: boolean; midiNote: number }[] {
  const positions: { x: number; isWhiteKey: boolean; midiNote: number }[] = [];
  // White key pattern: C=0, D=2, E=4, F=5, G=7, A=9, B=11
  const whiteNotes = new Set([0, 2, 4, 5, 7, 9, 11]);

  // Find MIDI range
  const midiLow = Math.floor(12 * Math.log2(stringFundamental / 440) + 69);
  const freqHigh = stringFundamental * Math.pow(2, rangeOctaves);
  const midiHigh = Math.ceil(12 * Math.log2(freqHigh / 440) + 69);

  for (let midi = midiLow; midi <= midiHigh; midi++) {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const x = frequencyToX(freq, stringFundamental, rangeOctaves);
    if (x >= 0 && x <= 1) {
      positions.push({
        x,
        isWhiteKey: whiteNotes.has(midi % 12),
        midiNote: midi,
      });
    }
  }

  return positions;
}

/**
 * Get the fundamental frequency of each string.
 */
export function getStringFundamentals(config: InstrumentConfig): number[] {
  const fundamentals: number[] = [];
  const ratio = config.stringRatio[0] / config.stringRatio[1];
  for (let i = 0; i < config.numStrings; i++) {
    fundamentals.push(config.fundamentalFreq * Math.pow(ratio, i));
  }
  return fundamentals;
}

/**
 * Build StringConfig array with colors and layout info.
 * Positions are relative to the canvas (0-based), not the page.
 */
export function buildStringConfigs(
  config: InstrumentConfig,
  canvasHeight: number,
): StringConfig[] {
  const fundamentals = getStringFundamentals(config);
  const stringHeight = canvasHeight / config.numStrings;

  const colors = ['#2a4858', '#3a3058', '#583a2a', '#2a5838'];

  return fundamentals.map((freq, i) => ({
    index: i,
    fundamentalFreq: freq,
    // Lowest string at bottom, highest at top
    yTop: (config.numStrings - 1 - i) * stringHeight,
    yBottom: (config.numStrings - i) * stringHeight,
    color: colors[i % colors.length],
  }));
}
