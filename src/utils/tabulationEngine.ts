// src/utils/tabulationEngine.ts
// Fixed-point precision calculation engine and strict academic validation rules

export type MarkEntry = number | 'AB' | null | undefined | '';

export class StrictTabulationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StrictTabulationValidationError';
  }
}

/**
 * Calculates weighted totals using scaled integer fixed-point arithmetic (Scale: 10,000)
 * Eliminates IEEE-754 binary floating-point drift.
 */
export function calculateWeightedTotal(
  scores: { mark: number; weight: number }[]
): { standardFloat: number; fixedPointExact: number } {
  // Standard IEEE-754 path (subject to binary fraction drift)
  const standardFloat = scores.reduce((acc, curr) => acc + curr.mark * curr.weight, 0);

  // Scaled integer arithmetic path (Scale: 10,000)
  const SCALE = 10000n;
  const fixedPointSum = scores.reduce((acc, curr) => {
    // Scale mark by 100 and weight by 100 -> product scaled by 10,000
    const scaledMark = BigInt(Math.round(curr.mark * 100));
    const scaledWeight = BigInt(Math.round(curr.weight * 100));
    return acc + (scaledMark * scaledWeight);
  }, 0n);

  const fixedPointExact = Number(fixedPointSum) / 10000;

  return {
    standardFloat,
    fixedPointExact
  };
}

/**
 * Computes class academic average under CBSE/ICSE regulatory rules:
 * - Numeric 0 is a valid earned score and is counted in the divisor.
 * - 'AB' (Absent) is validly recorded but excluded from the average divisor.
 * - Null, undefined, or empty string entries throw a StrictTabulationValidationError.
 */
export function computeClassAverage(marks: MarkEntry[]): number {
  if (!marks || marks.length === 0) {
    return 0;
  }

  let totalScoreScaled = 0n;
  let validParticipants = 0;

  for (let i = 0; i < marks.length; i++) {
    const val = marks[i];

    // Blanks, null, or undefined trigger strict audit exceptions
    if (val === null || val === undefined || val === '') {
      throw new StrictTabulationValidationError(
        `Blank or unrecorded entry detected at index ${i}. Affiliation compliance requires explicit score or 'AB'.`
      );
    }

    // Absent status is marked on the grade sheet but excluded from class divisor
    if (val === 'AB') {
      continue;
    }

    if (typeof val === 'number') {
      if (isNaN(val) || val < 0) {
        throw new StrictTabulationValidationError(
          `Invalid numeric score '${val}' at index ${i}. Score must be a non-negative number.`
        );
      }
      // Fixed point accumulation (x100)
      totalScoreScaled += BigInt(Math.round(val * 100));
      validParticipants++;
    } else {
      throw new StrictTabulationValidationError(
        `Unexpected token '${val}' at index ${i}. Expected number or 'AB'.`
      );
    }
  }

  if (validParticipants === 0) {
    return 0;
  }

  const averageScaled = Number(totalScoreScaled / BigInt(validParticipants)) / 100;
  return Number(averageScaled.toFixed(2));
}
