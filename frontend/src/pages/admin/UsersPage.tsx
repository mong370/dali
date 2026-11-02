import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Pencil, ShieldCheck, Trash2, UserCheck, UserRound, Users, UserX } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AdminPageSkeleton } from '../../components/Skeletons';
import { ErrorState, StatusBadge, TablePagination } from '../../components/ui';
import { shortDate } from '../../lib/format';
import type { Paginated } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { useAuth } from '../../store/auth';
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
  useClampPage,
  useDebounced,
  useListParams,
} from './listKit';

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  isActive: boolean;
  isBanned?: boolean;
  banReason?: string;
  orderCount?: number;
  createdAt: string;
}
interface UserList extends Paginated<AdminUser> {
  stats: { all: number; customers: number; admins: number; active: number; disabled: number; banned: number };
}
type Pending = { user: AdminUser; action: 'disable' | 'enable' | 'ban' | 'unban' | 'delete' };

const ordersText = (count = 0) => `${count} ${count === 1 ? 'order' : 'orders'}`;

export default function UsersPage() {
  useTitle('Users');
  const client = useQueryClient();
  const me = useAuth((state) => state.user?.id);
  const list = useListParams(['role', 'status']);
  const back = useBackState();
  const q = useDebounced(list.q);
  const [pending, setPending] = useState<Pending | null>(null);
  const [banReason, setBanReason] = useState('');

  const filters = {
    role: list.get('role') || undefined,
    status: list.get('status') || undefined,
    q: q || undefined,
    page: list.rawPage,
    limit: list.perPage,
  };
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'users', filters],
    placeholderData: keepPreviousData,
    queryFn: async () => (await api.get<UserList>('/admin/users', { params: filters })).data,
  });
  useClampPage(list.rawPage, data?.pages, list.goToPage);

  const ask = (user: AdminUser, action: Pending['action']) => {
    setBanReason('');
    setPending({ user, action });
  };

  const act = useMutation({
    mutationFn: ({ user, action }: Pending) => {
      const url = `/admin/users/${user._id}`;
      if (action === 'delete') return api.delete(url);
      const changes = {
        disable: { isActive: false },
        enable: { isActive: true },
        ban: { isBanned: true, banReason: banReason.trim() },
        unban: { isBanned: false },
      }[action];
      return api.patch(url, changes);
    },
    onSettled: () => setPending(null),
    onSuccess: (_result, { user, action }) => {
      const done = { disable: 'disabled', enable: 'enabled', ban: 'banned', unban: 'unbanned', delete: 'deleted' }[action];
      toast.success(`${user.name} ${done}`);
      client.invalidateQueries({ queryKey: ['admin', 'users'] });
      client.invalidateQueries({ queryKey: ['admin', 'user'] });
      client.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isPending) return <AdminPageSkeleton stats={6} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { stats } = data;

  return (
    <div className="space-y-4">
      <ListHeader title="Users" addTo="/admin/users/new" addLabel="Add user" back={back} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="All users" value={stats.all} icon={Users} tone="bg-pink-100 text-brand-dark" active={!list.hasFilters} onClick={list.clear} />
        <StatCard label="Customers" value={stats.customers} icon={UserRound} tone="bg-blue-100 text-blue-700" active={list.get('role') === 'customer'} onClick={() => list.toggle('role', 'customer')} />
        <StatCard label="Admins" value={stats.admins} icon={ShieldCheck} tone="bg-indigo-100 text-indigo-700" active={list.get('role') === 'admin'} onClick={() => list.toggle('role', 'admin')} />
        <StatCard label="Active" value={stats.active} icon={UserCheck} tone="bg-green-100 text-green-700" active={list.get('status') === 'active'} onClick={() => list.toggle('status', 'active')} />
        <StatCard label="Disabled" value={stats.disabled} icon={UserX} tone="bg-neutral-200 text-neutral-700" active={list.get('status') === 'disabled'} onClick={() => list.toggle('status', 'disabled')} />
        <StatCard label="Banned" value={stats.banned} icon={Ban} tone="bg-red-100 text-red-700" active={list.get('status') === 'banned'} onClick={() => list.toggle('status', 'banned')} />
      </div>

      <ListToolbar q={list.q} onSearch={list.setSearch} placeholder="Search name, email or phone" hasFilters={list.hasFilters} onClear={list.clear}>
        <FilterSelect label="Filter by role" value={list.get('role')} onChange={(value) => list.setFilter('role', value)}
          options={[['', 'All roles'], ['customer', 'Customers'], ['admin', 'Admins']]} />
        <FilterSelect label="Filter by status" value={list.get('status')} onChange={(value) => list.setFilter('status', value)}
          options={[['', 'All statuses'], ['active', 'Active'], ['disabled', 'Disabled'], ['banned', 'Banned']]} />
      </ListToolbar>

      {data.items.length === 0 ? (
        <NoResults noun="users" />
      ) : (
        <div className={`card transition-opacity md:overflow-x-auto ${isFetching ? 'opacity-70' : ''}`}>
          <table className="responsive-table w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-600">
              <tr>
                <th className="p-3 font-medium">Name</th>
                <th className="font-medium">Email</th>
                <th className="font-medium md:max-xl:hidden">Phone</th>
                <th className="font-medium">Orders</th>
                <th className="font-medium md:max-xl:hidden">Joined</th>
                <th className="font-medium">Role</th>
                <th className="font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.items.map((user) => {
                const isSelf = user._id === me;
                return (
                  <tr key={user._id}>
                    <td className="p-3">
                      <Link to={`/admin/users/${user._id}`} state={back} className="flex items-center gap-2.5 font-medium hover:text-brand">
                        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold uppercase text-brand-dark">{user.name.charAt(0)}</span>
                        <span className="min-w-0">{user.name}</span>
                        {isSelf && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">You</span>}
                      </Link>
                    </td>
                    <td data-label="Email" className="pr-3">{user.email}</td>
                    <td data-label="Phone" className="whitespace-nowrap pr-3 md:max-xl:hidden">{user.phone || '–'}</td>
                    <td data-label="Orders" className="pr-3 tabular-nums">{user.orderCount ?? 0}</td>
                    <td data-label="Joined" className="whitespace-nowrap pr-3 md:max-xl:hidden">{shortDate(user.createdAt)}</td>
                    <td data-label="Role" className="pr-3"><StatusBadge status={user.role === 'admin' ? 'processing' : 'confirmed'} label={user.role === 'admin' ? 'Admin' : 'Customer'} /></td>
                    <td data-label="Status" title={user.banReason}>
                      {user.isBanned ? (
                        <StatusBadge status="returned" label="Banned" />
                      ) : user.isActive ? (
                        <StatusBadge status="delivered" label="Active" />
                      ) : (
                        <StatusBadge status="cancelled" label="Disabled" />
                      )}
                    </td>
                    <td className="pr-3">
                      <RowActions>
                        <IconLink to={`/admin/users/${user._id}`} state={back} title="Edit" label={`Edit ${user.name}`} icon={Pencil} />
                        {!isSelf && !user.isBanned && (user.isActive ? (
                          <IconButton title="Disable" label={`Disable ${user.name}`} icon={UserX} tone="neutral" onClick={() => ask(user, 'disable')} />
                        ) : (
                          <IconButton title="Enable" label={`Enable ${user.name}`} icon={UserCheck} tone="brand" onClick={() => ask(user, 'enable')} />
                        ))}
                        {!isSelf && (user.isBanned ? (
                          <IconButton title="Lift ban" label={`Lift ban on ${user.name}`} icon={ShieldCheck} tone="brand" onClick={() => ask(user, 'unban')} />
                        ) : (
                          <IconButton title="Ban" label={`Ban ${user.name}`} icon={Ban} onClick={() => ask(user, 'ban')} />
                        ))}
                        {!isSelf && <IconButton title="Delete" label={`Delete ${user.name}`} icon={Trash2} onClick={() => ask(user, 'delete')} />}
                      </RowActions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data.total > 0 && (
        <TablePagination page={Math.min(list.rawPage, data.pages)} perPage={list.perPage} total={data.total} perPageOptions={PER_PAGE_OPTIONS}
          noun={data.total === stats.all ? 'users' : `matching users (${stats.all} in total)`} onPage={list.goToPage} onPerPage={list.changePerPage} />
      )}

      {pending?.action === 'disable' && (
        <ConfirmDialog title={`Disable ${pending.user.name}?`} confirmLabel="Disable" pendingLabel="Updating…" pending={act.isPending} onConfirm={() => act.mutate(pending)} onClose={() => setPending(null)}>
          They won't be able to sign in until you enable the account again. Their orders and details are kept.
        </ConfirmDialog>
      )}
      {pending?.action === 'enable' && (
        <ConfirmDialog title={`Enable ${pending.user.name}?`} tone="brand" confirmLabel="Enable" pendingLabel="Updating…" pending={act.isPending} onConfirm={() => act.mutate(pending)} onClose={() => setPending(null)}>
          They will be able to sign in and shop again.
        </ConfirmDialog>
      )}
      {pending?.action === 'unban' && (
        <ConfirmDialog title={`Lift the ban on ${pending.user.name}?`} tone="brand" confirmLabel="Lift ban" pendingLabel="Updating…" pending={act.isPending} onConfirm={() => act.mutate(pending)} onClose={() => setPending(null)}>
          {pending.user.banReason ? `They were banned for: ${pending.user.banReason}. ` : ''}They will be able to sign in again.
        </ConfirmDialog>
      )}
      {pending?.action === 'ban' && (
        <ConfirmDialog title={`Ban ${pending.user.name}?`} confirmLabel="Ban user" pendingLabel="Banning…" pending={act.isPending} confirmDisabled={banReason.trim().length < 3} onConfirm={() => act.mutate(pending)} onClose={() => setPending(null)}>
          <p>They will be signed out and blocked from signing in. They'll see this reason when they try.</p>
          <label className="label mt-3 text-left" htmlFor="ban-reason">Reason</label>
          <textarea id="ban-reason" rows={2} maxLength={300} className="input" placeholder="e.g. Repeated fake orders" value={banReason} onChange={(event) => setBanReason(event.target.value)} />
        </ConfirmDialog>
      )}
      {pending?.action === 'delete' && (
        <ConfirmDialog title={`Delete ${pending.user.name}?`} pending={act.isPending} onConfirm={() => act.mutate(pending)} onClose={() => setPending(null)}>
          This removes the account permanently and can't be undone.{' '}
          {pending.user.orderCount ? `Their ${ordersText(pending.user.orderCount)} will be kept as records. ` : ''}
          They could sign up again with the same email, so ban them instead if you want to keep them out.
        </ConfirmDialog>
      )}
    </div>
  );
}
