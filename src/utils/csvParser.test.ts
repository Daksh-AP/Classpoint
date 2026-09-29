import { describe, it, expect } from 'vitest';
import { parseAcademicCsv, sanitizeCsvCell } from './csvParser';

describe('Category 3 - Test 3: Malicious CSV Ingestion', () => {
  it('neutralizes DDE / formula injection payloads (=, +, -, @, cmd|)', () => {
    const maliciousPayloads = [
      "=cmd|' /C calc'!A0",
      "+12345",
      "-9999",
      "@SUM(1+1)*cmd|' /C calc'!A0",
      "\tpowershell.exe -enc AAA"
    ];

    for (const payload of maliciousPayloads) {
      const { value, wasSanitized } = sanitizeCsvCell(payload);
      expect(wasSanitized).toBe(true);
      expect(value.startsWith("'")).toBe(true);
      // Ensure formula invocation character is neutralized
      expect(value.startsWith("=")).toBe(false);
      expect(value.startsWith("@")).toBe(false);
    }
  });

  it('normalizes whitespace around roll numbers and handles ragged/merged columns', () => {
    const rawCsv = `RollNo, StudentName, PhysicsMarks, Remarks
"  10101  ", "Aarav Sharma", 88.5, Regular
10102 , "Diya Patel  ", =cmd|' /C calc'!A0, Transferred
10103, "Rohan Verma", 92.0`;

    const parsed = parseAcademicCsv(rawCsv);

    expect(parsed.headers).toEqual(['RollNo', 'StudentName', 'PhysicsMarks', 'Remarks']);
    expect(parsed.rows.length).toBe(3);

    // Assert leading/trailing spaces trimmed
    expect(parsed.rows[0].RollNo).toBe('10101');
    expect(parsed.rows[0].StudentName).toBe('Aarav Sharma');
    expect(parsed.rows[1].RollNo).toBe('10102');
    expect(parsed.rows[1].StudentName).toBe('Diya Patel');

    // Assert formula injection neutralized in cell
    expect(parsed.rows[1].PhysicsMarks).toBe("'=cmd|' /C calc'!A0");
    expect(parsed.sanitizedCellCount).toBeGreaterThan(0);

    // Assert ragged/missing columns don't throw, default to empty string
    expect(parsed.rows[2].Remarks).toBe('');
  });
});
