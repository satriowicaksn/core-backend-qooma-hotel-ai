import { describe, expect, it } from '@jest/globals';
import { z } from 'zod';

import { parseCsvWithSchema } from '../csv-parser.js';

const MenuRowSchema = z.object({
  name: z.string().min(1).max(120),
  price_idr: z.coerce.number().int().nonnegative(),
  category: z.string().min(1),
});
type MenuRow = z.infer<typeof MenuRowSchema>;

const MENU_COLUMNS = ['name', 'price_idr', 'category'] as const;
const menuOpts = { columns: MENU_COLUMNS, hasHeader: true };

describe('parseCsvWithSchema', () => {
  it('should parse a simple unquoted CSV with header skip', () => {
    const csv = 'name,price_idr,category\nNasi Goreng,45000,breakfast\nKopi Tubruk,25000,beverages';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(errors).toEqual([]);
    expect(valid).toEqual([
      { name: 'Nasi Goreng', price_idr: 45000, category: 'breakfast' },
      { name: 'Kopi Tubruk', price_idr: 25000, category: 'beverages' },
    ]);
  });

  it('should parse quoted fields with embedded commas', () => {
    const csv = 'name,price_idr,category\n"Doe, John\'s Special",50000,breakfast';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(errors).toEqual([]);
    expect(valid[0]?.name).toBe("Doe, John's Special");
    expect(valid[0]?.price_idr).toBe(50000);
  });

  it('should parse escaped quotes ("") inside quoted fields', () => {
    const csv = 'name,price_idr,category\n"He said ""hello""",30000,breakfast';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(errors).toEqual([]);
    expect(valid[0]?.name).toBe('He said "hello"');
  });

  it('should normalize CRLF line endings', () => {
    const csv = 'name,price_idr,category\r\nNasi,45000,breakfast\r\nKopi,25000,beverages';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(errors).toEqual([]);
    expect(valid).toHaveLength(2);
    expect(valid[0]?.name).toBe('Nasi');
    expect(valid[1]?.name).toBe('Kopi');
  });

  it('should normalize lone CR line endings (classic Mac format)', () => {
    const csv = 'name,price_idr,category\rNasi,45000,breakfast\rKopi,25000,beverages';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(errors).toEqual([]);
    expect(valid).toHaveLength(2);
  });

  it('should tolerate mixed CRLF + LF + CR line endings in the same input', () => {
    const csv =
      'name,price_idr,category\r\nNasi,45000,breakfast\nKopi,25000,beverages\rEsTeh,15000,beverages';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(errors).toEqual([]);
    expect(valid).toHaveLength(3);
    expect(valid.map((r) => r.name)).toEqual(['Nasi', 'Kopi', 'EsTeh']);
  });

  it('should strip a UTF-8 BOM at the start of input', () => {
    const csv = '﻿name,price_idr,category\nNasi,45000,breakfast';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(errors).toEqual([]);
    expect(valid[0]?.name).toBe('Nasi');
  });

  it('should silently skip whitespace-only rows without reporting errors', () => {
    const csv = 'name,price_idr,category\nNasi,45000,breakfast\n   \n\t\nKopi,25000,beverages';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(errors).toEqual([]);
    expect(valid).toHaveLength(2);
  });

  it('should report column-count mismatch as a row error', () => {
    const csv = 'name,price_idr,category\nNasi,45000\nKopi,25000,beverages,extra';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(valid).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.issues[0]).toContain('column count mismatch');
    expect(errors[0]?.issues[0]).toContain('expected 3');
    expect(errors[0]?.issues[0]).toContain('got 2');
    expect(errors[1]?.issues[0]).toContain('got 4');
  });

  it('should return empty valid + errors for empty input', () => {
    const { valid, errors } = parseCsvWithSchema<MenuRow>('', MenuRowSchema, menuOpts);

    expect(valid).toEqual([]);
    expect(errors).toEqual([]);
  });

  it('should skip the first line when hasHeader is true', () => {
    const csv = 'name,price_idr,category\nNasi,45000,breakfast';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, {
      columns: MENU_COLUMNS,
      hasHeader: true,
    });

    expect(errors).toEqual([]);
    expect(valid).toHaveLength(1);
    expect(valid[0]?.name).toBe('Nasi');
  });

  it('should treat every line as data when hasHeader is false (default)', () => {
    const csv = 'Nasi,45000,breakfast\nKopi,25000,beverages';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, {
      columns: MENU_COLUMNS,
    });

    expect(errors).toEqual([]);
    expect(valid).toHaveLength(2);
  });

  it('should populate both valid and errors when some rows are invalid (partial success)', () => {
    const csv =
      'name,price_idr,category\nNasi,45000,breakfast\n,not-a-number,breakfast\nKopi,25000,beverages';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(valid).toHaveLength(2);
    expect(valid.map((r) => r.name)).toEqual(['Nasi', 'Kopi']);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.issues.length).toBeGreaterThan(0);
  });

  it('should return empty valid + populated errors when all rows fail zod validation', () => {
    const csv = 'name,price_idr,category\n,not-a-number,\n,-5,';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(valid).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors.every((e) => e.issues.length > 0)).toBe(true);
  });

  it('should track rowIndex (0-based data) and line (1-based file) correctly with header and skipped blanks', () => {
    // line 1 = header, line 2 = blank (skipped), line 3 = data (rowIndex 0),
    // line 4 = blank (skipped), line 5 = data with zod error (rowIndex 1).
    const csv = 'name,price_idr,category\n\nNasi Goreng,45000,breakfast\n\nKopi,invalid,beverages';

    const { valid, errors } = parseCsvWithSchema<MenuRow>(csv, MenuRowSchema, menuOpts);

    expect(valid).toHaveLength(1);
    expect(valid[0]?.name).toBe('Nasi Goreng');

    expect(errors).toHaveLength(1);
    expect(errors[0]?.line).toBe(5);
    expect(errors[0]?.rowIndex).toBe(1);
    expect(errors[0]?.raw).toEqual(['Kopi', 'invalid', 'beverages']);
  });
});
