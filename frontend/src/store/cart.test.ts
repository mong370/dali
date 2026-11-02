import { beforeEach, describe, expect, it } from 'vitest';
import { selectCount, useCart } from './cart';

const line = { product: 'p1', variant: 'v1', quantity: 1 };

describe('cart store', () => {
  beforeEach(() => useCart.getState().clear());

  it('combines repeated additions of the same variant', () => {
    useCart.getState().add(line);
    useCart.getState().add({ ...line, quantity: 2 });
    expect(useCart.getState().items).toEqual([{ ...line, quantity: 3 }]);
  });

  it('keeps different variants of a product separate', () => {
    useCart.getState().add(line);
    useCart.getState().add({ ...line, variant: 'v2' });
    expect(useCart.getState().items).toHaveLength(2);
    expect(selectCount(useCart.getState())).toBe(2);
  });

  it('never lets quantity fall below one', () => {
    useCart.getState().add(line);
    useCart.getState().setQuantity('p1', 'v1', 0);
    expect(useCart.getState().items[0]?.quantity).toBe(1);
  });

  it('removes a line', () => {
    useCart.getState().add(line);
    useCart.getState().remove('p1', 'v1');
    expect(useCart.getState().items).toEqual([]);
  });
});
