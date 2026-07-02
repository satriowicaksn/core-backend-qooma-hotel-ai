/**
 * CSV parser + row validator — pure fn with batched error surface.
 *
 * `parseCsvWithSchema<T>(input, schema, opts)` parses a CSV string, validates
 * each data row against a zod schema, and returns a `CsvParseResult<T>` with
 * both successful rows (`valid`) and per-row errors (`errors`). Consumers can
 * render partial-success UX (import valid, show error list for invalid).
 *
 * Consumer wiring (mirrors env.ts:14-27 zod convention):
 *
 *   import { z } from 'zod';
 *   import { parseCsvWithSchema } from '@shared/utils/csv-parser.js';
 *
 *   const MenuRowSchema = z.object({
 *     name: z.string().min(1).max(120),
 *     price_idr: z.coerce.number().int().nonnegative(),
 *     category: z.string().min(1),
 *   });
 *   type MenuRow = z.infer<typeof MenuRowSchema>;
 *
 *   const { valid, errors } = parseCsvWithSchema<MenuRow>(csvText, MenuRowSchema, {
 *     columns: ['name', 'price_idr', 'category'],
 *     hasHeader: true,
 *   });
 *   // valid:  readonly MenuRow[]
 *   // errors: readonly CsvRowError[]
 *
 * Deconstruction pattern (per API-stability commitment): consumers may
 * deconstruct `{ valid, errors }` at the call site — result-object shape is
 * `readonly interface`, so adding fields later is non-breaking.
 *
 * ---
 *
 * Slice-1 supports (Excel / Google Sheets "practical CSV" subset):
 *   - Quoted fields with embedded commas:      `"Doe, John",30`
 *   - Escaped quotes inside quoted fields:      `"He said ""hello"""`
 *   - Line endings LF / CRLF / CR (normalized to LF; mix-in-input tolerated)
 *   - UTF-8 BOM stripped from input start (Excel emits this)
 *   - Empty / whitespace-only rows silently skipped (not reported as errors)
 *   - Column-count mismatch reported as CsvRowError (never thrown)
 *
 * Slice-1 does NOT support (deferred to slice-2 with `csv-parse` dep + PO ratification):
 *   - Multi-line quoted values (LF inside a quoted field ENDS the row here
 *     instead of extending the cell — consumer sees a column-count error on
 *     the next line, which is the intended slice-1 signal to escalate)
 *   - Streaming for very large files (parses input string entirely in memory)
 *   - Custom delimiters (comma-only)
 *   - Alternative quote characters (double-quote only)
 */

import type { ZodType } from 'zod';

export interface CsvRowError {
  readonly rowIndex: number;
  readonly line: number;
  readonly issues: readonly string[];
  readonly raw: readonly string[];
}

export interface CsvParseResult<T> {
  readonly valid: readonly T[];
  readonly errors: readonly CsvRowError[];
}

export interface CsvParseOptions {
  readonly columns: readonly string[];
  readonly hasHeader?: boolean;
}

const BOM = '﻿';

type ParserState = 'FieldStart' | 'Unquoted' | 'Quoted' | 'QuoteInQuoted';

function normalize(input: string): string {
  const withoutBom = input.startsWith(BOM) ? input.slice(1) : input;
  return withoutBom.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseLineToCells(line: string): string[] {
  const cells: string[] = [];
  let state: ParserState = 'FieldStart';
  let buffer = '';

  for (const ch of line) {
    if (state === 'FieldStart') {
      if (ch === '"') {
        state = 'Quoted';
      } else if (ch === ',') {
        cells.push('');
      } else {
        buffer += ch;
        state = 'Unquoted';
      }
      continue;
    }

    if (state === 'Unquoted') {
      if (ch === ',') {
        cells.push(buffer);
        buffer = '';
        state = 'FieldStart';
      } else {
        buffer += ch;
      }
      continue;
    }

    if (state === 'Quoted') {
      if (ch === '"') {
        state = 'QuoteInQuoted';
      } else {
        buffer += ch;
      }
      continue;
    }

    // state === 'QuoteInQuoted'
    if (ch === '"') {
      buffer += '"';
      state = 'Quoted';
    } else if (ch === ',') {
      cells.push(buffer);
      buffer = '';
      state = 'FieldStart';
    } else {
      buffer += ch;
      state = 'Unquoted';
    }
  }

  cells.push(buffer);
  return cells;
}

export function parseCsvWithSchema<T>(
  input: string,
  schema: ZodType<T>,
  opts: CsvParseOptions,
): CsvParseResult<T> {
  const valid: T[] = [];
  const errors: CsvRowError[] = [];

  const lines = normalize(input).split('\n');
  const expectedColumnCount = opts.columns.length;

  let rowIndex = 0;
  let headerSkipped = !opts.hasHeader;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? '';
    const line = i + 1;

    if (rawLine.trim() === '') {
      continue;
    }

    if (!headerSkipped) {
      headerSkipped = true;
      continue;
    }

    const cells = parseLineToCells(rawLine);

    if (cells.length !== expectedColumnCount) {
      errors.push({
        rowIndex,
        line,
        issues: [`column count mismatch: expected ${expectedColumnCount}, got ${cells.length}`],
        raw: cells,
      });
      rowIndex++;
      continue;
    }

    const rowObject: Record<string, string> = {};
    for (let c = 0; c < expectedColumnCount; c++) {
      const columnName = opts.columns[c] ?? '';
      rowObject[columnName] = cells[c] ?? '';
    }

    const result = schema.safeParse(rowObject);
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        rowIndex,
        line,
        issues: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
        raw: cells,
      });
    }
    rowIndex++;
  }

  return { valid, errors };
}
