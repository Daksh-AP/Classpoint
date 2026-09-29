import { describe, it, expect } from 'vitest';
import {
  calculateWeightedTotal,
  computeClassAverage,
  StrictTabulationValidationError,
  MarkEntry
} from './tabulationEngine';

describe('Category 3 - Tabulation & Calculation Integrity', () => {
  // Test 1: Floating-Point Drift
  it('Test 1: Floating-Point Drift - eliminates IEEE-754 precision drift via fixed-point math', () => {
    // Assessment components with fractional marks (0.1 and 0.2)
    // 0.1 * 1.0 + 0.2 * 1.0 = 0.30000000000000004 in IEEE-754
    const components = [
      { mark: 0.1, weight: 1.0 },
      { mark: 0.2, weight: 1.0 }
    ];

    const { standardFloat, fixedPointExact } = calculateWeightedTotal(components);

    // Exact mathematical result
    expect(fixedPointExact).toBe(0.3);

    // Standard IEEE-754 suffers binary floating point drift: 0.30000000000000004
    expect(standardFloat).toBe(0.30000000000000004);
    expect(standardFloat).not.toBe(0.3);
    expect(Math.abs(fixedPointExact - 0.3)).toBe(0);
  });

  // Test 2: Null, Zero, and Absent Logic
  it('Test 2: Null, Zero, and Absent Logic - counts 0 in divisor, excludes AB, throws on blank/null', () => {
    // 1. Numeric 0 vs AB: Class of 3 students: [20, 0, 'AB']
    // Valid participants = 2 (scores 20 and 0). AB is not counted in denominator.
    // Average must be (20 + 0) / 2 = 10.00
    const marksWithAbsent: MarkEntry[] = [20, 0, 'AB'];
    const average = computeClassAverage(marksWithAbsent);
    expect(average).toBe(10.0);

    // 2. All zero class: [0, 0, 0] -> average = 0.00
    expect(computeClassAverage([0, 0, 0])).toBe(0);

    // 3. Null entry must throw StrictTabulationValidationError
    expect(() => computeClassAverage([25, null, 28])).toThrow(StrictTabulationValidationError);

    // 4. Undefined entry must throw StrictTabulationValidationError
    expect(() => computeClassAverage([25, undefined, 28])).toThrow(StrictTabulationValidationError);

    // 5. Blank string entry must throw StrictTabulationValidationError
    expect(() => computeClassAverage([25, '', 28])).toThrow(StrictTabulationValidationError);
  });
});
