import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Product } from '../lib/types';
import { useAuth } from '../store/auth';
import { api, errorMessage } from './client';

interface WishlistData {
  ids: string[];
  items: Product[];
}

export function useWishlist() {
  const signedIn = useAuth((state) => Boolean(state.user));
  return useQuery({
    queryKey: ['wishlist'],
    enabled: signedIn,
    queryFn: async () => (await api.get<WishlistData>('/users/me/wishlist')).data,
  });
}

export function useToggleWishlist() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const signedIn = useAuth((state) => Boolean(state.user));
  const mutation = useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      saved ? api.delete(`/users/me/wishlist/${id}`) : api.put(`/users/me/wishlist/${id}`),
    onSettled: () => client.invalidateQueries({ queryKey: ['wishlist'] }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (id: string, saved: boolean) => {
    if (!signedIn) {
      toast('Sign in to save items to your wishlist');
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    mutation.mutate({ id, saved });
  };
}
