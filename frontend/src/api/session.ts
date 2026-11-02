import { useEffect } from 'react';
import { useAuth } from '../store/auth';
import { useCart } from '../store/cart';
import type { CartItem, User } from '../lib/types';
import { api, refreshSession } from './client';

/** Call after sign-in: adds the guest cart to the account's saved cart. */
export async function syncCartAfterLogin() {
  const { data } = await api.post<{ items: CartItem[] }>('/cart/merge', {
    items: useCart.getState().items,
  });
  useCart.getState().replace(data.items);
}

export async function signOut() {
  await api.post('/auth/logout').catch(() => undefined);
  useAuth.getState().clearSession();
  useCart.getState().clear();
}

export function completeLogin(user: User, accessToken: string) {
  useAuth.getState().setSession(user, accessToken);
  return syncCartAfterLogin().catch(() => undefined);
}

let bootstrapped = false;

/** Restores the session on page load, and saves cart changes to the account. */
export function useSessionBootstrap() {
  useEffect(() => {
    if (bootstrapped) return;
    bootstrapped = true;
    refreshSession().then((token) => {
      // The session is known now. The cart syncs in the background so slow networks don't hold up the page.
      useAuth.getState().markReady();
      if (token) syncCartAfterLogin().catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useCart.subscribe((state, previous) => {
      if (state.items === previous.items || !useAuth.getState().accessToken) return;
      clearTimeout(timer);
      // Short delay so rapid quantity clicks result in one save.
      timer = setTimeout(() => {
        api.put('/cart', { items: state.items }).catch(() => undefined);
      }, 400);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
