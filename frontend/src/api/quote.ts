import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CartItem, Quote } from '../lib/types';
import { useAuth } from '../store/auth';
import { api } from './client';

export function useQuote(items: CartItem[], options: { couponCode?: string; district?: string } = {}) {
  const userId = useAuth((state) => state.user?.id);
  return useQuery({
    queryKey: ['quote', items, options.couponCode, options.district, userId],
    enabled: items.length > 0,
    staleTime: 0,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await api.post<Quote>('/cart/quote', { items, ...options })).data,
  });
}
