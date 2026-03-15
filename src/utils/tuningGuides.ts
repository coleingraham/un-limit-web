import type { TuningGuide, StringConfig } from './types.ts';

/**
 * Compute the pixel slope for a tuning guide line.
 * The guide represents a frequency ratio, so its slope on the log-frequency
 * canvas depends on the ratio between strings and the guide ratio.
 *
 * slope = (stringHeight) / (pixelsPerOctave * log2(guideRatio / stringRatio^n))
 * But for a single string step: slope = stringHeight / (pxPerOctave * log2(guideRatio))
 */
export function computeGuideSlope(
  guideRatio: [number, number],
  stringRatio: [number, number],
  stringHeight: number,
  pixelsPerOctave: number,
): number {
  const guideLog = Math.log2(guideRatio[0] / guideRatio[1]);
  const stringLog = Math.log2(stringRatio[0] / stringRatio[1]);

  // How many pixels horizontally per string step vertically
  const xPerString = guideLog / stringLog * pixelsPerOctave * stringLog;

  // Slope = dy/dx, where dy = -stringHeight (moving up), dx = horizontal shift
  if (xPerString === 0) return Infinity;
  return -stringHeight / xPerString;
}

/**
 * Find where a guide line from a touch intersects with other strings.
 * Returns [{stringIndex, x}] for each intersection.
 */
export function findGuideIntersections(
  touchX: number,
  touchStringIndex: number,
  guide: TuningGuide,
  strings: StringConfig[],
  stringRatio: [number, number],
  canvasWidth: number,
  rangeOctaves: number,
): { stringIndex: number; x: number }[] {
  const intersections: { stringIndex: number; x: number }[] = [];
  const guideLog = Math.log2(guide.ratio[0] / guide.ratio[1]);
  const stringLog = Math.log2(stringRatio[0] / stringRatio[1]);

  for (const str of strings) {
    if (str.index === touchStringIndex) continue;

    const stringDiff = str.index - touchStringIndex;
    // The x offset in normalized coordinates (0..1) for this string
    const xOffsetNorm = (guideLog - stringDiff * stringLog) / rangeOctaves;
    // In pixel space (touchX is in pixels)
    const xNorm = touchX / canvasWidth;
    const intersectXNorm = xNorm + xOffsetNorm;

    if (intersectXNorm >= 0 && intersectXNorm <= 1) {
      intersections.push({
        stringIndex: str.index,
        x: intersectXNorm * canvasWidth,
      });
    }
  }

  return intersections;
}

/**
 * Check if two frequencies match a given ratio within tolerance.
 */
export function checkRatioMatch(
  freq1: number,
  freq2: number,
  ratio: [number, number],
  toleranceCents: number = 10,
): boolean {
  return getRatioDetuning(freq1, freq2, ratio) < toleranceCents;
}

/**
 * Get the detuning in cents between two frequencies relative to a target ratio.
 * Returns the smallest difference considering octave equivalences.
 */
export function getRatioDetuning(
  freq1: number,
  freq2: number,
  ratio: [number, number],
): number {
  const higher = Math.max(freq1, freq2);
  const lower = Math.min(freq1, freq2);
  const actualRatio = higher / lower;
  const targetRatio = ratio[0] / ratio[1];

  const actualCents = 1200 * Math.log2(actualRatio);
  const targetCents = 1200 * Math.log2(targetRatio);

  const diff = Math.abs(actualCents % 1200 - targetCents % 1200);
  return Math.min(diff, Math.abs(diff - 1200));
}
