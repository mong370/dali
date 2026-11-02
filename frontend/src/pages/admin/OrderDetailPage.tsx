import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState, StatusBadge } from '../../components/ui';
import { STATUS_LABELS, money, shortDate } from '../../lib/format';
import type { Order, OrderStatus } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { DetailPanelsSkeleton } from '../../components/Skeletons';

export default function OrderDetailPage() {
  const { id } = useParams();
  const client = useQueryClient();
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: async () =>
      (await api.get<{ order: Order; nextStatuses: OrderStatus[] }>(`/orders/${id}`)).data,
  });
  useTitle(data?.order.orderNumber);

  const update = useMutation({
    mutationFn: (status: OrderStatus) => api.patch(`/orders/${id}/status`, { status, note: note || undefined }),
    onSettled: () => setConfirming(null),
    onSuccess: () => {
      toast.success('Order updated');
      setNote('');
      client.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isPending) return <DetailPanelsSkeleton className="" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const { order, nextStatuses } = data;
  const address = order.shippingAddress;
  return (
    <div className="space-y-4">
      {confirming && (
        <ConfirmDialog
          title={`Mark ${order.orderNumber} as ${STATUS_LABELS[confirming]}?`}
          confirmLabel={`Mark as ${STATUS_LABELS[confirming]}`}
          pendingLabel="Updating…"
          pending={update.isPending}
          onConfirm={() => update.mutate(confirming)}
          onClose={() => setConfirming(null)}
        >
          Its stock will be restored. This can't be undone.
        </ConfirmDialog>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
          <p className="text-sm text-neutral-600">Placed {shortDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} label={STATUS_LABELS[order.status]} />
      </div>

      {nextStatuses.length > 0 && (
        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">Update Status</h2>
          <input aria-label="Note for the status update" className="input" placeholder="Optional note, shown to the customer" value={note} onChange={(event) => setNote(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            {nextStatuses.map((status) => {
              const destructive = status === 'cancelled' || status === 'returned';
              return (
                <button key={status} className={destructive ? 'btn-danger' : 'btn-primary'} disabled={update.isPending}
                  onClick={() => (destructive ? setConfirming(status) : update.mutate(status))}>
                  Mark as {STATUS_LABELS[status]}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Customer</h2>
          <p>{order.user?.name ?? 'Deleted account'}</p>
          {order.user && <p className="text-neutral-600">{order.user.email}</p>}
          <h3 className="mb-1 mt-3 font-medium">Deliver to</h3>
          <p>{address.fullName}, {address.phone}</p>
          <p>{address.line1}, {address.area}, {address.district}</p>
          {order.note && <p className="mt-2 rounded bg-amber-50 p-2 text-xs">Note: {order.note}</p>}
        </section>
        <section className="card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Payment</h2>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{money(order.shippingFee)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>−{money(order.discount)}</dd></div>}
            <div className="flex justify-between border-t border-neutral-200 pt-1 font-semibold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
          <p className="mt-2 text-xs capitalize text-neutral-600">Cash on delivery · {order.paymentStatus}</p>
        </section>
      </div>

      <section className="card p-4 md:overflow-x-auto">
        <h2 className="mb-2 font-semibold">Items</h2>
        <table className="responsive-table w-full text-left text-sm">
          <thead className="text-xs text-neutral-600"><tr><th className="py-1 font-medium">Product</th><th className="font-medium">SKU</th><th className="font-medium">Qty</th><th className="font-medium">Total</th></tr></thead>
          <tbody className="divide-y divide-neutral-100">
            {order.items.map((item) => (
              <tr key={item._id}>
                <td className="py-2">{item.name}{Object.keys(item.options ?? {}).length > 0 && <span className="block text-xs text-neutral-600">{Object.entries(item.options).map(([name, value]) => `${name}: ${value}`).join(', ')}</span>}</td>
                <td data-label="SKU" className="whitespace-nowrap">{item.sku}</td>
                <td data-label="Qty" className="tabular-nums">{item.quantity}</td>
                <td data-label="Total" className="whitespace-nowrap tabular-nums">{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-4 text-sm">
        <h2 className="mb-2 font-semibold">History</h2>
        <ol className="space-y-2 border-l-2 border-brand-line pl-4">
          {order.statusHistory.map((entry) => (
            <li key={`${entry.status}-${entry.at}`}>
              <span className="font-medium">{STATUS_LABELS[entry.status]}</span>
              <span className="ml-2 text-xs text-neutral-500">{shortDate(entry.at)}</span>
              {entry.note && <p className="text-xs text-neutral-600">{entry.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
