import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuth } from '../store/auth';
import type { User } from '../lib/types';

export const api = axios.create({ baseURL: '/api/v1', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

/** Exchanges the refresh cookie for a new session. Parallel callers share one request. */
export function refreshSession(): Promise<string | null> {
  refreshing ??= axios
    .post<{ user: User; accessToken: string }>('/api/v1/auth/refresh', null, {
      withCredentials: true,
    })
    .then(({ data }) => {
      useAuth.getState().setSession(data.user, data.accessToken);
      return data.accessToken;
    })
    .catch(() => {
      useAuth.getState().clearSession();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  const isAuthCall = original?.url?.startsWith('/auth/');
  if (error.response?.status !== 401 || !original || original._retried || isAuthCall) {
    throw error;
  }
  original._retried = true;
  const token = await refreshSession();
  if (!token) throw error;
  original.headers.Authorization = `Bearer ${token}`;
  return api(original);
});

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error?.message) return error.response.data.error.message;
    if (!error.response) return 'Could not reach the server. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export type UploadFolder = 'products' | 'categories' | 'banners' | 'general';

export const uploadImage = async (file: File, folder: UploadFolder = 'general') => {
  const form = new FormData();
  // The server reads the folder from text fields sent ahead of the file.
  form.append('folder', folder);
  form.append('file', file);
  const { data } = await api.post<{ url: string }>('/uploads', form);
  return data.url;
};
