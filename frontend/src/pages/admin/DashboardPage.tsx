import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Banknote,
  ExternalLink,
  Inbox,
  Package,
  PackageCheck,
  Plus,
  ShoppingBag,
  Tags,
  TriangleAlert,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ErrorState, StatusBadge } from '../../components/ui';
import { STATUS_LABELS, money, shortDate } from '../../lib/format';
import type { Order, OrderStatus } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { useAuth } from '../../store/auth';
import { DashboardSkeleton } from '../../components/Skeletons';
import { SmartImage } from '../../components/SmartImage';
import { ORDER_STATUS_ICONS } from './listKit';

interface Dashboard {
  revenue: number;
  orders: number;
  customers: number;
  products: number;
  ordersByStatus: Record<string, number>;
  lowStock: { _id: string; name: string; totalStock: number; images: string[] }[];
  recentOrders: (Pick<Order, '_id' | 'orderNumber' | 'total' | 'status' | 'createdAt'> & {
    shippingAddress: { fullName: string };
  })[];
}

function StatCard({
  label,
  value,
  hint,
  to,
  icon: Icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  to: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Link to={to} className="card group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="size-5" />
        </span>
        <ArrowRight className="size-4 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-brand" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-sm text-neutral-600">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] text-neutral-500">{hint}</p>}
      </div>
    </Link>
  );
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: LucideIcon;
  action?: { label: string; to: string };
  children: ReactNode;
}) {
  return (
    <section className="card min-w-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-brand" /> {title}
        </h2>
        {action && (
          <Link to={action.to} className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand hover:underline">
            {action.label} <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyPanel({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-6" />
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-neutral-600">{text}</p>
    </div>
  );
}

export default function DashboardPage() {
  useTitle('Admin dashboard');
  const name = useAuth((state) => state.user?.name);
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => (await api.get<Dashboard>('/admin/dashboard')).data,
  });
  if (isPending) return <DashboardSkeleton />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const pending = data.ordersByStatus.pending ?? 0;
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-dark to-brand p-5 text-white sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-medium">{today}</p>
          <h1 className="mt-1 text-2xl font-semibold">Welcome back, {name}</h1>
          <p className="mt-1 text-sm">
            {pending > 0
              ? `${pending} ${pending === 1 ? 'order is' : 'orders are'} waiting for you to confirm.`
              : 'No orders are waiting for you to confirm.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/products/new" className="btn rounded-full bg-white text-brand-dark hover:bg-brand-soft">
            <Plus className="size-4" /> Add product
          </Link>
          <Link to="/admin/categories" className="btn rounded-full border border-white/70 text-white hover:bg-white/15">
            <Tags className="size-4" /> Categories
          </Link>
          <Link to="/" className="btn rounded-full border border-white/70 text-white hover:bg-white/15">
            <ExternalLink className="size-4" /> View store
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Order value" value={money(data.revenue)} hint="Excludes cancelled and returned" to="/admin/orders" icon={Banknote} tone="bg-pink-100 text-brand-dark" />
        <StatCard label="Orders" value={data.orders} hint="Excludes cancelled and returned" to="/admin/orders" icon={ShoppingBag} tone="bg-indigo-100 text-indigo-700" />
        <StatCard label="Customers" value={data.customers} to="/admin/users" icon={Users} tone="bg-blue-100 text-blue-700" />
        <StatCard label="Active products" value={data.products} to="/admin/products" icon={Package} tone="bg-green-100 text-green-700" />
      </div>

      <Panel title="Orders by Status" icon={Truck} action={{ label: 'All orders', to: '/admin/orders' }}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {(Object.keys(ORDER_STATUS_ICONS) as OrderStatus[]).map((status) => {
            const { icon: Icon, tone } = ORDER_STATUS_ICONS[status];
            return (
              <Link key={status} to={`/admin/orders?status=${status}`} className="flex items-center gap-2.5 rounded-xl border border-neutral-200 p-2.5 transition hover:border-brand">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-lg font-semibold leading-tight tabular-nums">{data.ordersByStatus[status] ?? 0}</span>
                  <span className="block truncate text-xs text-neutral-600">{STATUS_LABELS[status]}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Panel title="Recent Orders" icon={ShoppingBag} action={{ label: 'View all', to: '/admin/orders' }}>
          {data.recentOrders.length === 0 ? (
            <EmptyPanel icon={Inbox} title="No orders yet" text="New orders will appear here as soon as customers check out." />
          ) : (
            <div className="-mx-4 md:mx-0 md:overflow-x-auto">
              <table className="responsive-table w-full text-left text-sm">
                <thead className="text-xs text-neutral-600">
                  <tr>
                    <th className="py-1.5 font-medium">Order</th>
                    <th className="font-medium">Customer</th>
                    <th className="font-medium">Date</th>
                    <th className="font-medium">Total</th>
                    <th className="font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td className="whitespace-nowrap py-2.5 pr-3">
                        <Link to={`/admin/orders/${order._id}`} className="font-medium text-brand hover:underline">{order.orderNumber}</Link>
                      </td>
                      <td data-label="Customer" className="pr-3">
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold uppercase text-brand-dark">
                            {order.shippingAddress.fullName.charAt(0)}
                          </span>
                          {order.shippingAddress.fullName}
                        </span>
                      </td>
                      <td data-label="Date" className="whitespace-nowrap pr-3">{shortDate(order.createdAt)}</td>
                      <td data-label="Total" className="whitespace-nowrap pr-3 tabular-nums">{money(order.total)}</td>
                      <td data-label="Status"><StatusBadge status={order.status} label={STATUS_LABELS[order.status]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Low Stock" icon={TriangleAlert} action={{ label: 'Products', to: '/admin/products' }}>
          {data.lowStock.length === 0 ? (
            <EmptyPanel icon={PackageCheck} title="Everything is well stocked" text="Products with 5 or fewer left will appear here." />
          ) : (
            <ul className="divide-y divide-neutral-100 text-sm">
              {data.lowStock.map((product) => (
                <li key={product._id}>
                  <Link to={`/admin/products/${product._id}`} className="group flex items-center gap-3 py-2">
                    <SmartImage src={product.images[0]} className="size-9 shrink-0 rounded-lg" />
                    <span className="line-clamp-2 min-w-0 flex-1 leading-snug group-hover:text-brand">{product.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${product.totalStock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                      {product.totalStock === 0 ? 'Out' : `${product.totalStock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
