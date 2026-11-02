import { describe, expect, it } from 'vitest';
import { pageNumbers } from './ui';

describe('pageNumbers', () => {
  it('lists every page when there are few', () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(2, 3)).toEqual([1, 2, 3]);
  });

  it('marks gaps around the current page', () => {
    expect(pageNumbers(1, 10)).toEqual([1, 2, null, 10]);
    expect(pageNumbers(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageNumbers(10, 10)).toEqual([1, null, 9, 10]);
  });

  it('shows a single hidden page instead of a gap', () => {
    expect(pageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageNumbers(4, 10)).toEqual([1, 2, 3, 4, 5, null, 10]);
  });
});
