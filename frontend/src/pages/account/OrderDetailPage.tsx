import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, errorMessage } from '../../api/client';
import { ErrorState, StatusBadge } from '../../components/ui';
import { STATUS_LABELS, money, shortDate } from '../../lib/format';
import type { Order } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { DetailPanelsSkeleton } from '../../components/Skeletons';
import { SmartImage } from '../../components/SmartImage';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const client = useQueryClient();
  const { data: order, error, isPending, refetch } = useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: async () => (await api.get<{ order: Order }>(`/orders/mine/${id}`)).data.order,
  });
  useTitle(order?.orderNumber);

  const cancel = useMutation({
    mutationFn: () => api.post(`/orders/mine/${id}/cancel`),
    onSuccess: () => {
      toast.success('Your order has been cancelled');
      client.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  if (isPending) return <DetailPanelsSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const address = order.shippingAddress;
  return (
    <div className="container-page max-w-3xl space-y-4 py-6">
      {params.get('placed') && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 p-4 text-green-900" role="status">
          <CheckCircle2 className="size-6 shrink-0" />
          <p className="text-sm"><strong>Thank you! Your order has been placed.</strong> Pay {money(order.total)} in cash when it arrives. Keep your order number <strong>{order.orderNumber}</strong> to track it.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-neutral-600">Placed {shortDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} label={STATUS_LABELS[order.status]} />
      </div>

      <ul className="card divide-y divide-neutral-200">
        {order.items.map((item) => (
          <li key={item._id} className="flex gap-3 p-3">
            <SmartImage src={item.image} className="size-16 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 text-sm">
              <Link to={`/products/${item.slug}`} className="line-clamp-2 font-medium hover:text-brand">{item.name}</Link>
              {Object.keys(item.options ?? {}).length > 0 && (
                <p className="text-xs text-neutral-600">{Object.entries(item.options).map(([name, value]) => `${name}: ${value}`).join(', ')}</p>
              )}
              <p className="text-neutral-600">{money(item.unitPrice)} × {item.quantity}</p>
            </div>
            <span className="text-sm font-semibold">{money(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Delivery Address</h2>
          <p>{address.fullName}</p>
          <p>{address.phone}</p>
          <p>{address.line1}, {address.area}, {address.district}</p>
        </section>
        <section className="card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Payment</h2>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{order.shippingFee ? money(order.shippingFee) : 'Free'}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-green-700"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>−{money(order.discount)}</dd></div>}
            <div className="flex justify-between border-t border-neutral-200 pt-1 font-semibold"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-neutral-600">Cash on delivery · <span className="capitalize">{order.paymentStatus}</span></p>
        </section>
      </div>

      <section className="card p-4 text-sm">
        <h2 className="mb-2 font-semibold">Order Progress</h2>
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

      {(order.status === 'pending' || order.status === 'confirmed') && (
        <button className="btn-danger" disabled={cancel.isPending}
          onClick={() => {
            if (window.confirm('Cancel this order?')) cancel.mutate();
          }}>
          Cancel order
        </button>
      )}
    </div>
  );
}
