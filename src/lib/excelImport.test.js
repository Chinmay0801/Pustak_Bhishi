import { describe, it, expect } from 'vitest';
import { findHeaderRow, mapColumns, parseBookRows } from './excelImport';

describe('findHeaderRow', () => {
  it('skips title/blank rows above the real header', () => {
    const raw = [['पुस्तक भिशी यादी'], [], ['अ. नंबर', 'पुस्तकाचे नाव', 'लेखक'], [1, 'श्यामची आई', 'साने गुरुजी']];
    expect(findHeaderRow(raw)).toBe(2);
  });

  it('returns -1 for a sheet with no header', () => {
    expect(findHeaderRow([[1, 2], [3, 4]])).toBe(-1);
  });
});

describe('mapColumns', () => {
  it('matches Marathi headers', () => {
    expect(mapColumns(['अ. नंबर', 'पुस्तकाचे नाव', 'लेखक', 'किंमत', 'भिशी सभासद'])).toEqual({
      bookNumber: 0, title: 1, author: 2, price: 3, contributor: 4,
    });
  });

  it('matches English headers case-insensitively', () => {
    expect(mapColumns(['Title', 'AUTHOR', 'Book Number', 'Price', 'Owner'])).toEqual({
      title: 0, author: 1, bookNumber: 2, price: 3, contributor: 4,
    });
  });

  it('marks missing columns as -1', () => {
    expect(mapColumns(['Title', 'x']).author).toBe(-1);
  });
});

describe('parseBookRows', () => {
  const header = ['नंबर', 'नाव', 'लेखक', 'किंमत', 'भिशी'];

  it('parses rows and trims values', () => {
    const { books, skipped } = parseBookRows([header, [101, ' श्यामची आई ', 'साने गुरुजी', 150, ' Yogita ']]);
    expect(skipped).toBe(0);
    expect(books).toEqual([
      { bookNumber: '101', title: 'श्यामची आई', author: 'साने गुरुजी', price: '150', contributor: 'Yogita' },
    ]);
  });

  it('skips duplicates against existing numbers and within the sheet', () => {
    const raw = [header, [1, 'A', 'x'], [2, 'B', 'y'], [2, 'B again', 'y'], [3, 'C', 'z']];
    const { books, skipped } = parseBookRows(raw, ['3']);
    expect(books.map(b => b.title)).toEqual(['A', 'B']);
    expect(skipped).toBe(2);
  });

  it('keeps rows without a book number and defaults the author', () => {
    const { books } = parseBookRows([header, ['', 'No number', '']]);
    expect(books[0]).toMatchObject({ bookNumber: '', author: 'Unknown Author' });
  });

  it('ignores empty rows and rows without a title', () => {
    const { books } = parseBookRows([header, [], [5, '', 'author only']]);
    expect(books).toHaveLength(0);
  });

  it('throws when there is no title column', () => {
    expect(() => parseBookRows([['foo', 'bar'], [1, 2]])).toThrow(/title column/);
  });
});
