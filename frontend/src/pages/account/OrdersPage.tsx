import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { EmptyState, ErrorState, Pagination, StatusBadge } from '../../components/ui';
import { STATUS_LABELS, money, shortDate } from '../../lib/format';
import type { Order, Paginated } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { OrderListSkeleton } from '../../components/Skeletons';

export default function OrdersPage() {
  useTitle('My orders');
  const [page, setPage] = useState(1);
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['orders', page],
    queryFn: async () =>
      (await api.get<Paginated<Order>>('/orders/mine', { params: { page, limit: 10 } })).data,
  });

  if (isPending) return <OrderListSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="container-page max-w-3xl py-6">
      <h1 className="mb-4 font-heading text-2xl font-bold">My Orders</h1>
      {data.items.length === 0 ? (
        <EmptyState icon="📦" title="No orders yet">
          <Link to="/products" className="btn-primary mt-3">Start shopping</Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {data.items.map((order) => (
            <li key={order._id}>
              <Link to={`/account/orders/${order._id}`} className="card block p-4 transition hover:border-brand">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{order.orderNumber}</span>
                  <StatusBadge status={order.status} label={STATUS_LABELS[order.status]} />
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-neutral-700">
                  {order.items.map((item) => item.name).join(', ')}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {shortDate(order.createdAt)} · <span className="font-medium text-brand">{money(order.total)}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} pages={data.pages} onChange={setPage} />
    </div>
  );
}
