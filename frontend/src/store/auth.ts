import { create } from 'zustand';
import type { User } from '../lib/types';

interface AuthState {
  user: User | null;
  // Kept in memory only, so injected scripts cannot read it from storage.
  accessToken: string | null;
  // False until the first session check finishes, so pages do not flash signed-out.
  ready: boolean;
  setSession: (user: User, accessToken: string) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  markReady: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  ready: false,
  setSession: (user, accessToken) => set({ user, accessToken }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ user: null, accessToken: null }),
  markReady: () => set({ ready: true }),
}));
