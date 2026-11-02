import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { signOut } from '../../api/session';
import { DISTRICTS } from '../../lib/districts';
import type { Address, User } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { useAuth } from '../../store/auth';

const EMPTY = { label: 'Home', fullName: '', phone: '', district: 'Dhaka', area: '', line1: '', isDefault: false };

function AddressForm({ initial, onDone }: { initial: Partial<Address>; onDone: () => void }) {
  const setUser = useAuth((state) => state.setUser);
  const [values, setValues] = useState({ ...EMPTY, ...initial });
  const save = useMutation({
    mutationFn: async () => {
      const { _id, ...body } = values as typeof values & { _id?: string };
      const { data } = _id
        ? await api.patch<{ user: User }>(`/users/me/addresses/${_id}`, body)
        : await api.post<{ user: User }>('/users/me/addresses', body);
      return data.user;
    },
    onSuccess: (user) => {
      setUser(user);
      toast.success('Address saved');
      onDone();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const field = (key: 'label' | 'fullName' | 'phone' | 'area' | 'line1', label: string, span = false) => (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="label" htmlFor={`address-${key}`}>{label}</label>
      <input id={`address-${key}`} className="input" required value={values[key]}
        onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
    </div>
  );
  return (
    <form className="mt-3 grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-2"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        save.mutate();
      }}>
      {field('label', 'Label')}
      {field('fullName', 'Full name')}
      {field('phone', 'Mobile number')}
      <div>
        <label className="label" htmlFor="address-district">District</label>
        <select id="address-district" className="input" value={values.district} onChange={(event) => setValues({ ...values, district: event.target.value })}>
          {DISTRICTS.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>
      {field('area', 'Area / Thana')}
      {field('line1', 'Full address', true)}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="accent-brand" checked={values.isDefault} onChange={(event) => setValues({ ...values, isDefault: event.target.checked })} />
        Use as default address
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primary" disabled={save.isPending}>Save address</button>
        <button type="button" className="btn-outline" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  useTitle('My account');
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [editing, setEditing] = useState<Partial<Address> | null>(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  const saveProfile = useMutation({
    mutationFn: async () =>
      (await api.patch<{ user: User }>('/users/me', { name, ...(phone && { phone }) })).data.user,
    onSuccess: (updated) => {
      setUser(updated);
      toast.success('Profile updated');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const removeAddress = useMutation({
    mutationFn: async (id: string) => (await api.delete<{ user: User }>(`/users/me/addresses/${id}`)).data.user,
    onSuccess: setUser,
    onError: (error) => toast.error(errorMessage(error)),
  });

  const changePassword = useMutation({
    mutationFn: () => api.post('/users/me/password', passwords),
    onSuccess: async () => {
      toast.success('Password updated. Please sign in again.');
      await signOut();
      navigate('/login');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!user) return null;

  return (
    <div className="container-page max-w-3xl space-y-5 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">My Account</h1>
        <Link to="/account/orders" className="btn-outline">My orders</Link>
      </div>

      <form className="card grid gap-3 p-4 sm:grid-cols-2"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          saveProfile.mutate();
        }}>
        <h2 className="font-semibold sm:col-span-2">Profile</h2>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" className="input" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="profilePhone">Mobile number</label>
          <input id="profilePhone" className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        <p className="text-sm text-neutral-600 sm:col-span-2">Email: {user.email}</p>
        <div className="sm:col-span-2"><button className="btn-primary" disabled={saveProfile.isPending}>Save changes</button></div>
      </form>

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Saved Addresses</h2>
          {!editing && <button className="btn-outline py-1.5" onClick={() => setEditing({})}>Add address</button>}
        </div>
        {editing && <AddressForm key={editing._id ?? 'new'} initial={editing} onDone={() => setEditing(null)} />}
        <ul className="mt-3 space-y-2">
          {user.addresses.map((address) => (
            <li key={address._id} className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 p-3 text-sm">
              <div>
                <p className="font-medium">{address.label} {address.isDefault && <span className="ml-1 text-xs text-brand">Default</span>}</p>
                <p className="text-neutral-700">{address.fullName}, {address.phone}</p>
                <p className="text-neutral-700">{address.line1}, {address.area}, {address.district}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-xs font-medium">
                <button className="text-brand hover:underline" onClick={() => setEditing(address)}>Edit</button>
                <button className="text-red-600 hover:underline" onClick={() => removeAddress.mutate(address._id)}>Delete</button>
              </div>
            </li>
          ))}
          {user.addresses.length === 0 && !editing && <li className="text-sm text-neutral-600">No saved addresses yet.</li>}
        </ul>
      </section>

      <form className="card grid gap-3 p-4 sm:grid-cols-2"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          changePassword.mutate();
        }}>
        <h2 className="font-semibold sm:col-span-2">Change Password</h2>
        <div>
          <label className="label" htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" type="password" required autoComplete="current-password" className="input" value={passwords.currentPassword}
            onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">New password</label>
          <input id="newPassword" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className="input" value={passwords.newPassword}
            onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
        </div>
        <div className="sm:col-span-2"><button className="btn-primary" disabled={changePassword.isPending}>Update password</button></div>
      </form>
    </div>
  );
}
