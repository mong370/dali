import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import { StatusBadge } from '../components/ui';
import { STATUS_LABELS, money, shortDate } from '../lib/format';
import type { Order } from '../lib/types';
import { useTitle } from '../lib/useTitle';

type Tracking = Pick<Order, 'orderNumber' | 'status' | 'statusHistory' | 'createdAt' | 'total'> & {
  items: { name: string; quantity: number }[];
};

export default function TrackOrderPage() {
  useTitle('Track your order');
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const track = useMutation({
    mutationFn: async () =>
      (await api.post<{ order: Tracking }>('/orders/track', { orderNumber, phone })).data.order,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    track.mutate();
  };

  return (
    <div className="container-page max-w-xl py-8">
      <h1 className="font-heading text-2xl font-bold">Track your order</h1>
      <p className="mt-1 text-sm text-neutral-600">Enter your order number and the mobile number used for delivery.</p>
      <form onSubmit={submit} className="card mt-4 space-y-3 p-4">
        <div>
          <label className="label" htmlFor="orderNumber">Order number</label>
          <input id="orderNumber" required className="input" placeholder="DL-261102-A1B2C3" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="trackPhone">Mobile number</label>
          <input id="trackPhone" required type="tel" className="input" placeholder="01712345678" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </div>
        {track.error && <p className="text-sm text-red-600" role="alert">{errorMessage(track.error)}</p>}
        <button className="btn-primary w-full" disabled={track.isPending}>{track.isPending ? 'Checking…' : 'Track order'}</button>
      </form>

      {track.data && (
        <section className="card mt-4 p-4" aria-live="polite">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{track.data.orderNumber}</h2>
            <StatusBadge status={track.data.status} label={STATUS_LABELS[track.data.status]} />
          </div>
          <p className="mt-1 text-sm text-neutral-600">Placed {shortDate(track.data.createdAt)} · {money(track.data.total)}</p>
          <ol className="mt-4 space-y-2 border-l-2 border-brand-line pl-4 text-sm">
            {track.data.statusHistory.map((entry) => (
              <li key={`${entry.status}-${entry.at}`}>
                <span className="font-medium">{STATUS_LABELS[entry.status]}</span>
                <span className="ml-2 text-xs text-neutral-500">{shortDate(entry.at)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
