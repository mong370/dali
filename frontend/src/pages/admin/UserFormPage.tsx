import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { FormSkeleton } from '../../components/Skeletons';
import { EmptyState, ErrorState, StatusBadge } from '../../components/ui';
import { useTitle } from '../../lib/useTitle';
import { useAuth } from '../../store/auth';
import { FormActions, useBackUrl } from './listKit';
import type { AdminUser } from './UsersPage';

function UserForm({ user }: { user?: AdminUser }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const backTo = useBackUrl('/admin/users');
  const me = useAuth((state) => state.user);
  const setMe = useAuth((state) => state.setUser);
  const isSelf = user?._id === me?.id;
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    role: user?.role ?? ('customer' as AdminUser['role']),
    password: '',
  });

  const save = useMutation({
    mutationFn: () => {
      const { password, role, ...details } = form;
      const payload = {
        ...details,
        ...(!isSelf && { role }),
        ...(password && { password }),
      };
      return user ? api.patch(`/admin/users/${user._id}`, payload) : api.post('/admin/users', payload);
    },
    onSuccess: () => {
      toast.success(user ? 'User updated' : 'User saved');
      if (isSelf && me) setMe({ ...me, name: form.name, email: form.email.toLowerCase(), phone: form.phone || undefined });
      client.invalidateQueries({ queryKey: ['admin', 'users'] });
      client.invalidateQueries({ queryKey: ['admin', 'user'] });
      client.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      navigate(backTo);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const status = user?.isBanned ? 'banned' : user && !user.isActive ? 'disabled' : 'active';

  return (
    <form
      className="space-y-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <h1 className="text-2xl font-semibold">{user ? 'Edit user' : 'Add user'}</h1>

      <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
        <section className="card grid gap-3 p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Details</h2>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" required minLength={2} maxLength={80} autoComplete="off" className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="off" className="input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Mobile number (optional)</label>
            <input id="phone" type="tel" autoComplete="off" pattern="(\+?88)?01[3-9][0-9]{8}" title="A Bangladeshi mobile number, e.g. 01712345678" className="input" placeholder="01712345678" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
        </section>

        <div className="space-y-4">
          <section className="card space-y-3 p-4">
            <h2 className="font-semibold">Access</h2>
            <div>
              <label className="label" htmlFor="role">Role</label>
              <select id="role" className="input" disabled={isSelf} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AdminUser['role'] })}>
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-1 text-xs text-neutral-600">
                {isSelf ? 'You cannot change your own role.' : 'Admins have full access to this panel. Changing the role signs them out.'}
              </p>
            </div>
            {user && (
              <div className="text-sm">
                <p className="label">Status</p>
                <StatusBadge status={status === 'active' ? 'delivered' : status === 'banned' ? 'returned' : 'cancelled'} label={status === 'active' ? 'Active' : status === 'banned' ? 'Banned' : 'Disabled'} />
                {user.banReason && <p className="mt-1 break-words text-xs text-neutral-600">Reason: {user.banReason}</p>}
                <p className="mt-1 text-xs text-neutral-600">Change this with the icons in the user list.</p>
              </div>
            )}
          </section>

          <section className="card space-y-2 p-4">
            <h2 className="font-semibold">Password</h2>
            {isSelf ? (
              <p className="text-sm text-neutral-600">Change your own password from <Link to="/account" className="text-brand underline">My account</Link>.</p>
            ) : (
              <>
                <label className="label" htmlFor="password">{user ? 'New password (optional)' : 'Password'}</label>
                <div className="relative">
                  <input id="password" type={showPassword ? 'text' : 'password'} required={!user} minLength={8} maxLength={72} autoComplete="new-password" className="input pr-10" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
                  <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-neutral-600" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-xs text-neutral-600">
                  {user ? 'Leave empty to keep the current password. Setting one signs them out.' : 'At least 8 characters. Share it with them securely.'}
                </p>
              </>
            )}
          </section>
        </div>
      </div>

      <FormActions isEdit={Boolean(user)} pending={save.isPending} backTo={backTo} />
    </form>
  );
}

export default function UserFormPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  useTitle(isNew ? 'Add user' : 'Edit user');
  const { data: user, error, isPending, refetch } = useQuery({
    queryKey: ['admin', 'user', id],
    enabled: !isNew,
    retry: false,
    queryFn: async () => (await api.get<{ user: AdminUser }>(`/admin/users/${id}`)).data.user,
  });

  if (isNew) return <UserForm key="new" />;
  if (isPending) return <FormSkeleton className="w-full" />;
  if (error) {
    const missing = (error as { response?: { status?: number } }).response?.status === 404;
    if (missing) {
      return (
        <EmptyState icon="👤" title="User not found">
          <Link to="/admin/users" className="btn-primary mt-3">Back to users</Link>
        </EmptyState>
      );
    }
    return <ErrorState error={error} onRetry={refetch} />;
  }
  return <UserForm key={id} user={user} />;
}
