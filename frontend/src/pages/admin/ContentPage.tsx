import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, EyeOff, Images, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AdminPageSkeleton } from '../../components/Skeletons';
import { SmartImage } from '../../components/SmartImage';
import { ErrorState, StatusBadge, TablePagination } from '../../components/ui';
import { money } from '../../lib/format';
import type { Banner } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import {
  FilterSelect,
  IconButton,
  IconLink,
  ListHeader,
  ListToolbar,
  NoResults,
  PER_PAGE_OPTIONS,
  RowActions,
  StatCard,
  useBackState,
  useListParams,
} from './listKit';

export function useAdminBanners() {
  return useQuery({
    queryKey: ['admin', 'content', 'banners'],
    queryFn: async () => (await api.get<{ items: Banner[] }>('/content/banners')).data.items,
  });
}

export default function ContentPage() {
  useTitle('Banners');
  const client = useQueryClient();
  const list = useListParams(['status']);
  const back = useBackState();
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const { data: banners, error, isPending, refetch } = useAdminBanners();

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/content/banners/${id}`),
    onSettled: () => setDeleting(null),
    onSuccess: () => {
      toast.success('Banner deleted');
      client.invalidateQueries({ queryKey: ['admin', 'content'] });
      client.invalidateQueries({ queryKey: ['home'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isPending) return <AdminPageSkeleton stats={3} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const needle = list.q.trim().toLowerCase();
  const status = list.get('status');
  const rows = banners.filter((banner) => {
    if (needle && !`${banner.title} ${banner.eyebrow}`.toLowerCase().includes(needle)) return false;
    if (status === 'live' && !banner.isActive) return false;
    if (status === 'hidden' && banner.isActive) return false;
    return true;
  });
  const live = banners.filter((banner) => banner.isActive).length;
  const pages = Math.max(1, Math.ceil(rows.length / list.perPage));
  const page = Math.min(list.rawPage, pages);
  const pageRows = rows.slice((page - 1) * list.perPage, page * list.perPage);

  return (
    <div className="space-y-4">
      <ListHeader title="Banners" addTo="/admin/content/new" addLabel="Add banner" back={back} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="All banners" value={banners.length} icon={Images} tone="bg-pink-100 text-brand-dark" active={!list.hasFilters} onClick={list.clear} />
        <StatCard label="Live" value={live} icon={CircleCheck} tone="bg-green-100 text-green-700" active={status === 'live'} onClick={() => list.toggle('status', 'live')} />
        <StatCard label="Hidden" value={banners.length - live} icon={EyeOff} tone="bg-neutral-200 text-neutral-700" active={status === 'hidden'} onClick={() => list.toggle('status', 'hidden')} />
      </div>

      <ListToolbar q={list.q} onSearch={list.setSearch} placeholder="Search banners" hasFilters={list.hasFilters} onClear={list.clear}>
        <FilterSelect label="Filter by status" value={status} onChange={(value) => list.setFilter('status', value)}
          options={[['', 'All statuses'], ['live', 'Live'], ['hidden', 'Hidden']]} />
      </ListToolbar>

      {rows.length === 0 ? (
        <NoResults noun="banners" />
      ) : (
        <div className="card md:overflow-x-auto">
          <table className="responsive-table w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-600">
              <tr>
                <th className="p-3 font-medium">Banner</th>
                <th className="font-medium">Link</th>
                <th className="font-medium">From price</th>
                <th className="font-medium">Position</th>
                <th className="font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pageRows.map((banner) => (
                <tr key={banner._id}>
                  <td className="p-3">
                    <Link to={`/admin/content/${banner._id}`} state={back} className="flex items-center gap-3 hover:text-brand">
                      <SmartImage src={banner.image} tone={banner.dark ? 'dark' : 'soft'} className="h-16 w-12 shrink-0 rounded-lg" />
                      <span className="min-w-0">
                        <span className="block font-medium">{banner.title}</span>
                        {banner.eyebrow && <span className="block text-xs text-neutral-600">{banner.eyebrow}</span>}
                      </span>
                    </Link>
                  </td>
                  <td data-label="Link" className="pr-3 text-neutral-700">{banner.link}</td>
                  <td data-label="From price" className="whitespace-nowrap pr-3 tabular-nums">{banner.fromPrice ? money(banner.fromPrice) : '–'}</td>
                  <td data-label="Position" className="pr-3 tabular-nums">{banner.sortOrder}</td>
                  <td data-label="Status"><StatusBadge status={banner.isActive ? 'delivered' : 'cancelled'} label={banner.isActive ? 'Live' : 'Hidden'} /></td>
                  <td className="pr-3">
                    <RowActions>
                      <IconLink to={`/admin/content/${banner._id}`} state={back} title="Edit" label={`Edit ${banner.title}`} icon={Pencil} />
                      <IconButton title="Delete" label={`Delete ${banner.title}`} icon={Trash2} onClick={() => setDeleting(banner)} />
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <TablePagination page={page} perPage={list.perPage} total={rows.length} perPageOptions={PER_PAGE_OPTIONS}
          noun={rows.length === banners.length ? 'banners' : `matching banners (${banners.length} in total)`} onPage={list.goToPage} onPerPage={list.changePerPage} />
      )}

      {deleting && (
        <ConfirmDialog title={`Delete “${deleting.title}”?`} pending={remove.isPending} onConfirm={() => remove.mutate(deleting._id)} onClose={() => setDeleting(null)}>
          This banner will be removed from the homepage permanently. This can't be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}
