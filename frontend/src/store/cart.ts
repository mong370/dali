import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../lib/types';

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  setQuantity: (product: string, variant: string, quantity: number) => void;
  remove: (product: string, variant: string) => void;
  replace: (items: CartItem[]) => void;
  clear: () => void;
}

const same = (item: CartItem, product: string, variant: string) =>
  item.product === product && item.variant === variant;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (added) =>
        set(({ items }) => {
          const existing = items.find((item) => same(item, added.product, added.variant));
          return {
            items: existing
              ? items.map((item) =>
                  item === existing
                    ? { ...item, quantity: item.quantity + added.quantity }
                    : item,
                )
              : [...items, added],
          };
        }),
      setQuantity: (product, variant, quantity) =>
        set(({ items }) => ({
          items: items.map((item) =>
            same(item, product, variant) ? { ...item, quantity: Math.max(1, quantity) } : item,
          ),
        })),
      remove: (product, variant) =>
        set(({ items }) => ({ items: items.filter((item) => !same(item, product, variant)) })),
      replace: (items) => set({ items }),
      clear: () => set({ items: [] }),
    }),
    { name: 'dali-cart' },
  ),
);

export const selectCount = (state: CartState) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);
