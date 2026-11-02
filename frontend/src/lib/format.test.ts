import { describe, expect, it } from 'vitest';
import { money, toPoisha } from './format';

describe('money', () => {
  it('formats whole and fractional taka', () => {
    expect(money(170000)).toBe('৳1,700');
    expect(money(45813)).toBe('৳458.13');
    expect(money(0)).toBe('৳0');
  });
});

describe('toPoisha', () => {
  it('avoids floating point errors', () => {
    expect(toPoisha(19.99)).toBe(1999);
    expect(toPoisha(1.1)).toBe(110);
  });
});
