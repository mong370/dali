import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX, CircleCheck, CircleOff, Gift, Pencil, Power, Ticket, Trash2, TicketX } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AdminPageSkeleton } from '../../components/Skeletons';
import { ErrorState, StatusBadge, TablePagination } from '../../components/ui';
import { money, shortDate } from '../../lib/format';
import type { Coupon } from '../../lib/types';
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

export function useAdminCoupons() {
  return useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => (await api.get<{ items: Coupon[] }>('/coupons')).data.items,
  });
}

type CouponState = 'active' | 'off' | 'expired' | 'used';
const STATE_BADGES: Record<CouponState, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'delivered' },
  off: { label: 'Off', tone: 'cancelled' },
  expired: { label: 'Expired', tone: 'returned' },
  used: { label: 'Used up', tone: 'pending' },
};

function stateOf(coupon: Coupon): CouponState {
  if (!coupon.isActive) return 'off';
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) return 'expired';
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return 'used';
  return 'active';
}

function describe(coupon: Coupon) {
  if (coupon.type === 'percent') {
    return `${coupon.value}% off${coupon.maxDiscount ? `, up to ${money(coupon.maxDiscount)}` : ''}`;
  }
  if (coupon.type === 'fixed') return `${money(coupon.value)} off`;
  return `Free shipping${coupon.maxDiscount ? `, up to ${money(coupon.maxDiscount)}` : ''}`;
}

export default function CouponsPage() {
  useTitle('Coupons');
  const client = useQueryClient();
  const list = useListParams(['status', 'type', 'first']);
  const back = useBackState();
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const { data: coupons, error, isPending, refetch } = useAdminCoupons();
  const refresh = () => client.invalidateQueries({ queryKey: ['admin', 'coupons'] });

  const toggle = useMutation({
    mutationFn: (coupon: Coupon) => api.patch(`/coupons/${coupon._id}`, { isActive: !coupon.isActive }),
    onSuccess: refresh,
    onError: (err) => toast.error(errorMessage(err)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSettled: () => setDeleting(null),
    onSuccess: () => {
      toast.success('Coupon deleted');
      refresh();
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isPending) return <AdminPageSkeleton stats={6} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const needle = list.q.trim().toLowerCase();
  const status = list.get('status');
  const type = list.get('type');
  const rows = coupons.filter((coupon) => {
    if (needle && !`${coupon.code} ${coupon.description}`.toLowerCase().includes(needle)) return false;
    if (status && stateOf(coupon) !== status) return false;
    if (type && coupon.type !== type) return false;
    if (list.get('first') && !coupon.firstOrderOnly) return false;
    return true;
  });
  const count = (test: (coupon: Coupon) => boolean) => coupons.filter(test).length;
  const pages = Math.max(1, Math.ceil(rows.length / list.perPage));
  const page = Math.min(list.rawPage, pages);
  const pageRows = rows.slice((page - 1) * list.perPage, page * list.perPage);

  return (
    <div className="space-y-4">
      <ListHeader title="Coupons" addTo="/admin/coupons/new" addLabel="Add coupon" back={back} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="All coupons" value={coupons.length} icon={Ticket} tone="bg-pink-100 text-brand-dark" active={!list.hasFilters} onClick={list.clear} />
        <StatCard label="Active" value={count((coupon) => stateOf(coupon) === 'active')} icon={CircleCheck} tone="bg-green-100 text-green-700" active={status === 'active'} onClick={() => list.toggle('status', 'active')} />
        <StatCard label="Off" value={count((coupon) => stateOf(coupon) === 'off')} icon={CircleOff} tone="bg-neutral-200 text-neutral-700" active={status === 'off'} onClick={() => list.toggle('status', 'off')} />
        <StatCard label="Expired" value={count((coupon) => stateOf(coupon) === 'expired')} icon={CalendarX} tone="bg-red-100 text-red-700" active={status === 'expired'} onClick={() => list.toggle('status', 'expired')} />
        <StatCard label="Used up" value={count((coupon) => stateOf(coupon) === 'used')} icon={TicketX} tone="bg-amber-100 text-amber-700" active={status === 'used'} onClick={() => list.toggle('status', 'used')} />
        <StatCard label="First order" value={count((coupon) => coupon.firstOrderOnly)} icon={Gift} tone="bg-indigo-100 text-indigo-700" active={list.get('first') === '1'} onClick={() => list.toggle('first', '1')} />
      </div>

      <ListToolbar q={list.q} onSearch={list.setSearch} placeholder="Search coupons" hasFilters={list.hasFilters} onClear={list.clear}>
        <FilterSelect label="Filter by status" value={status} onChange={(value) => list.setFilter('status', value)}
          options={[['', 'All statuses'], ['active', 'Active'], ['off', 'Off'], ['expired', 'Expired'], ['used', 'Used up']]} />
        <FilterSelect label="Filter by type" value={type} onChange={(value) => list.setFilter('type', value)}
          options={[['', 'All types'], ['percent', 'Percentage off'], ['fixed', 'Fixed amount off'], ['free_shipping', 'Free shipping']]} />
      </ListToolbar>

      {rows.length === 0 ? (
        <NoResults noun="coupons" />
      ) : (
        <div className="card md:overflow-x-auto">
          <table className="responsive-table w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-600">
              <tr>
                <th className="p-3 font-medium">Code</th>
                <th className="font-medium">Offer</th>
                <th className="font-medium">Used</th>
                <th className="font-medium">Expires</th>
                <th className="font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {pageRows.map((coupon) => {
                const state = STATE_BADGES[stateOf(coupon)];
                return (
                  <tr key={coupon._id}>
                    <td className="p-3">
                      <Link to={`/admin/coupons/${coupon._id}`} state={back} className="font-semibold hover:text-brand">{coupon.code}</Link>
                      {coupon.description && <span className="block text-xs text-neutral-600">{coupon.description}</span>}
                    </td>
                    <td data-label="Offer" className="pr-3"><span>{describe(coupon)}{coupon.firstOrderOnly && <span className="block text-xs text-neutral-600">First order only</span>}</span></td>
                    <td data-label="Used" className="pr-3 tabular-nums"><span>{coupon.usedCount}{coupon.usageLimit > 0 && ` / ${coupon.usageLimit}`}</span></td>
                    <td data-label="Expires" className="whitespace-nowrap pr-3">{coupon.expiresAt ? shortDate(coupon.expiresAt) : 'Never'}</td>
                    <td data-label="Status"><StatusBadge status={state.tone} label={state.label} /></td>
                    <td className="pr-3">
                      <RowActions>
                        <IconButton title={coupon.isActive ? 'Turn off' : 'Turn on'} label={`${coupon.isActive ? 'Turn off' : 'Turn on'} ${coupon.code}`} icon={Power} tone={coupon.isActive ? 'neutral' : 'brand'} disabled={toggle.isPending} onClick={() => toggle.mutate(coupon)} />
                        <IconLink to={`/admin/coupons/${coupon._id}`} state={back} title="Edit" label={`Edit ${coupon.code}`} icon={Pencil} />
                        <IconButton title="Delete" label={`Delete ${coupon.code}`} icon={Trash2} onClick={() => setDeleting(coupon)} />
                      </RowActions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <TablePagination page={page} perPage={list.perPage} total={rows.length} perPageOptions={PER_PAGE_OPTIONS}
          noun={rows.length === coupons.length ? 'coupons' : `matching coupons (${coupons.length} in total)`} onPage={list.goToPage} onPerPage={list.changePerPage} />
      )}

      {deleting && (
        <ConfirmDialog title={`Delete coupon ${deleting.code}?`} pending={remove.isPending} onConfirm={() => remove.mutate(deleting._id)} onClose={() => setDeleting(null)}>
          Customers will no longer be able to use this code. Past orders are not affected. This can't be undone.
        </ConfirmDialog>
      )}
    </div>
  );
}
