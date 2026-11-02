import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Eye, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { AdminPageSkeleton } from '../../components/Skeletons';
import { ErrorState, StatusBadge, TablePagination } from '../../components/ui';
import { STATUS_LABELS, money, shortDate } from '../../lib/format';
import type { Order, OrderStatus, Paginated } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import {
  FilterSelect,
  IconLink,
  ListHeader,
  ListToolbar,
  NoResults,
  ORDER_STATUS_ICONS,
  PER_PAGE_OPTIONS,
  RowActions,
  StatCard,
  useBackState,
  useClampPage,
  useDebounced,
  useListParams,
} from './listKit';

interface OrderList extends Paginated<Order> {
  stats: Partial<Record<OrderStatus, number>>;
}

const PAYMENT_LABELS: Record<Order['paymentStatus'], string> = { unpaid: 'Unpaid', paid: 'Paid', refunded: 'Refunded' };
const PAYMENT_TONES: Record<Order['paymentStatus'], string> = { unpaid: 'pending', paid: 'delivered', refunded: 'returned' };

export default function OrdersPage() {
  useTitle('Orders');
  const list = useListParams(['status', 'payment']);
  const back = useBackState();
  const q = useDebounced(list.q);

  const filters = {
    status: list.get('status') || undefined,
    payment: list.get('payment') || undefined,
    q: q || undefined,
    page: list.rawPage,
    limit: list.perPage,
  };
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'orders', filters],
    placeholderData: keepPreviousData,
    queryFn: async () => (await api.get<OrderList>('/orders', { params: filters })).data,
  });
  useClampPage(list.rawPage, data?.pages, list.goToPage);

  if (isPending) return <AdminPageSkeleton stats={8} />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const statuses = Object.keys(ORDER_STATUS_ICONS) as OrderStatus[];
  const all = statuses.reduce((sum, status) => sum + (data.stats[status] ?? 0), 0);

  return (
    <div className="space-y-4">
      <ListHeader title="Orders" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-8">
        <StatCard label="All orders" value={all} icon={ShoppingBag} tone="bg-pink-100 text-brand-dark" active={!list.hasFilters} onClick={list.clear} />
        {statuses.map((status) => (
          <StatCard key={status} label={STATUS_LABELS[status] ?? status} value={data.stats[status] ?? 0} icon={ORDER_STATUS_ICONS[status].icon} tone={ORDER_STATUS_ICONS[status].tone}
            active={list.get('status') === status} onClick={() => list.toggle('status', status)} />
        ))}
      </div>

      <ListToolbar q={list.q} onSearch={list.setSearch} placeholder="Search order number, name or phone" hasFilters={list.hasFilters} onClear={list.clear}>
        <FilterSelect label="Filter by status" value={list.get('status')} onChange={(value) => list.setFilter('status', value)}
          options={[['', 'All statuses'], ...statuses.map((status) => [status, STATUS_LABELS[status] ?? status] as const)]} />
        <FilterSelect label="Filter by payment" value={list.get('payment')} onChange={(value) => list.setFilter('payment', value)}
          options={[['', 'All payments'], ['unpaid', 'Unpaid'], ['paid', 'Paid'], ['refunded', 'Refunded']]} />
      </ListToolbar>

      {data.items.length === 0 ? (
        all === 0 && !list.hasFilters ? (
          <div className="card p-8 text-center text-sm text-neutral-600" role="status">No orders yet. New orders appear here as soon as customers check out.</div>
        ) : (
          <NoResults noun="orders" />
        )
      ) : (
        <div className={`card transition-opacity md:overflow-x-auto ${isFetching ? 'opacity-70' : ''}`}>
          <table className="responsive-table w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-xs text-neutral-600">
              <tr>
                <th className="p-3 font-medium">Order</th>
                <th className="font-medium">Customer</th>
                <th className="font-medium">Date</th>
                <th className="font-medium">Items</th>
                <th className="font-medium">Total</th>
                <th className="font-medium">Payment</th>
                <th className="font-medium">Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.items.map((order) => (
                <tr key={order._id}>
                  <td className="p-3"><Link to={`/admin/orders/${order._id}`} state={back} className="whitespace-nowrap font-medium text-brand hover:underline">{order.orderNumber}</Link></td>
                  <td data-label="Customer" className="whitespace-nowrap pr-3"><span>{order.shippingAddress.fullName}<br /><span className="text-xs text-neutral-600">{order.shippingAddress.phone}</span></span></td>
                  <td data-label="Date" className="whitespace-nowrap pr-3">{shortDate(order.createdAt)}</td>
                  <td data-label="Items" className="pr-3 tabular-nums">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td data-label="Total" className="whitespace-nowrap pr-3 tabular-nums">{money(order.total)}</td>
                  <td data-label="Payment" className="pr-3"><StatusBadge status={PAYMENT_TONES[order.paymentStatus]} label={PAYMENT_LABELS[order.paymentStatus]} /></td>
                  <td data-label="Status"><StatusBadge status={order.status} label={STATUS_LABELS[order.status]} /></td>
                  <td className="pr-3">
                    <RowActions>
                      <IconLink to={`/admin/orders/${order._id}`} state={back} title="View order" label={`View order ${order.orderNumber}`} icon={Eye} />
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.total > 0 && (
        <TablePagination page={Math.min(list.rawPage, data.pages)} perPage={list.perPage} total={data.total} perPageOptions={PER_PAGE_OPTIONS}
          noun={data.total === all ? 'orders' : `matching orders (${all} in total)`} onPage={list.goToPage} onPerPage={list.changePerPage} />
      )}
    </div>
  );
}
