import { useQuery } from '@tanstack/react-query';
import { Bell, ChevronDown, ChevronRight, ExternalLink, LogOut, Menu, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { signOut } from '../api/session';
import type { Paginated } from '../lib/types';
import { useAuth } from '../store/auth';
import { useClickOutside } from './Header';

const SECTIONS: Record<string, string> = {
  orders: 'Orders',
  products: 'Products',
  categories: 'Categories',
  coupons: 'Coupons',
  content: 'Banners',
  users: 'Users',
};

function Breadcrumb() {
  const { pathname } = useLocation();
  const [, , section, detail] = pathname.split('/');
  const sectionLabel = section ? SECTIONS[section] : undefined;
  if (!section || !sectionLabel) {
    return <p className="truncate font-semibold">Dashboard</p>;
  }
  const item = { categories: 'category', coupons: 'coupon', content: 'banner', users: 'user' }[section] ?? 'product';
  const detailLabel =
    section === 'orders' ? 'Order details' : detail === 'new' ? `Add ${item}` : `Edit ${item}`;
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link to="/admin" className="hidden text-neutral-600 hover:text-brand sm:inline">Dashboard</Link>
      <ChevronRight className="hidden size-3.5 shrink-0 text-neutral-400 sm:block" />
      {detail ? (
        <>
          <Link to={`/admin/${section}`} className="text-neutral-600 hover:text-brand">{sectionLabel}</Link>
          <ChevronRight className="size-3.5 shrink-0 text-neutral-400" />
          <span className="truncate font-semibold">{detailLabel}</span>
        </>
      ) : (
        <span className="truncate font-semibold">{sectionLabel}</span>
      )}
    </nav>
  );
}

function PendingOrdersBell() {
  const { data: pending = 0 } = useQuery({
    queryKey: ['admin', 'pending-count'],
    queryFn: async () =>
      (await api.get<Paginated<unknown>>('/orders', { params: { status: 'pending', limit: 1 } })).data.total,
  });
  return (
    <Link
      to="/admin/orders?status=pending"
      aria-label={`Pending orders: ${pending}`}
      className="relative rounded-full p-2 text-neutral-700 transition hover:bg-brand-soft hover:text-brand"
    >
      <Bell className="size-5" />
      {pending > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
          {pending > 99 ? '99+' : pending}
        </span>
      )}
    </Link>
  );
}

function AccountMenu() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-brand-soft';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-brand-soft"
      >
        <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold uppercase text-white">
          {user?.name.charAt(0)}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-medium sm:block">{user?.name}</span>
        <ChevronDown className={`size-4 text-neutral-600 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-40 w-48 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
          <Link to="/account" role="menuitem" className={item}>
            <UserIcon className="size-4" /> My account
          </Link>
          <Link to="/" role="menuitem" className={item}>
            <ExternalLink className="size-4" /> View store
          </Link>
          <button
            role="menuitem"
            className={item}
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminHeader({ menuOpen, onOpenMenu }: { menuOpen: boolean; onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          className="-ml-2 shrink-0 rounded-full p-2 text-neutral-700 hover:bg-brand-soft lg:hidden"
          onClick={onOpenMenu}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="admin-menu"
        >
          <Menu className="size-5" />
        </button>
        <Breadcrumb />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PendingOrdersBell />
        <AccountMenu />
      </div>
    </header>
  );
}
