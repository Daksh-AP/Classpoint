// src/utils/csvParser.ts
// RFC 4180 CSV parser with formula injection defense and whitespace normalization

export interface CsvParseOptions {
  trimWhitespace?: boolean;
  neutralizeFormulas?: boolean;
  normalizeRaggedRows?: boolean;
}

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  sanitizedCellCount: number;
}

const DANGEROUS_FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes an individual CSV cell value against CSV / DDE formula injection
 */
export function sanitizeCsvCell(raw: string): { value: string; wasSanitized: boolean } {
  if (typeof raw !== 'string') {
    return { value: '', wasSanitized: false };
  }

  let wasSanitized = false;

  // 1. Check raw prefix before whitespace trim to catch \t, \r, and hidden control characters
  const hasRawFormulaPrefix = DANGEROUS_FORMULA_PREFIXES.some(prefix => raw.startsWith(prefix));

  // 2. Normalize and trim whitespace
  let cleaned = raw.trim();

  // 3. Check cleaned prefix
  const hasCleanedFormulaPrefix = DANGEROUS_FORMULA_PREFIXES.some(prefix => cleaned.startsWith(prefix));

  // 4. Detect DDE and shell execution vectors
  const hasDdeExecutionToken = /(cmd(\.exe)?\||powershell(\.exe)?|mshta(\.exe)?|regsvr32|certutil)/i.test(cleaned);

  if (hasRawFormulaPrefix || hasCleanedFormulaPrefix || hasDdeExecutionToken) {
    if (!cleaned.startsWith("'")) {
      cleaned = `'${cleaned}`;
    }
    wasSanitized = true;
  }

  return { value: cleaned, wasSanitized };
}

/**
 * Parses raw CSV text handling merged/ragged columns, trailing spaces, and formula injection
 */
export function parseAcademicCsv(
  csvContent: string,
  options: CsvParseOptions = { trimWhitespace: true, neutralizeFormulas: true, normalizeRaggedRows: true }
): CsvParseResult {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], sanitizedCellCount: 0 };
  }

  // Helper to split row respecting quotes
  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let insideQuote = false;
    let currentCell = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        cells.push(currentCell);
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell);
    return cells;
  };

  const rawHeaders = parseRow(lines[0]);
  const headers = rawHeaders.map(h => h.trim());
  const headerCount = headers.length;

  let totalSanitized = 0;
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const rawCells = parseRow(lines[r]);
    const rowObj: Record<string, string> = {};

    for (let c = 0; c < headerCount; c++) {
      const rawVal = rawCells[c] ?? '';
      let cellVal = options.trimWhitespace ? rawVal.trim() : rawVal;

      if (options.neutralizeFormulas) {
        const { value, wasSanitized } = sanitizeCsvCell(cellVal);
        cellVal = value;
        if (wasSanitized) totalSanitized++;
      }

      rowObj[headers[c]] = cellVal;
    }

    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    sanitizedCellCount: totalSanitized
  };
}
