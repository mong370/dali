import { useQuery } from '@tanstack/react-query';
import {
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  User as UserIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { signOut } from '../api/session';
import { BasketSearchAnimation } from '../components/BasketSearchAnimation';
import { Logo } from '../components/Logo';
import { CategoryIcon } from '../components/ui';
import { money } from '../lib/format';
import type { Category, Product } from '../lib/types';
import { useAuth } from '../store/auth';
import { selectCount, useCart } from '../store/cart';
import { SmartImage } from '../components/SmartImage';
import { NavPillsSkeleton } from '../components/Skeletons';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    staleTime: 5 * 60_000,
    queryFn: async () => (await api.get<{ items: Category[] }>('/categories')).data.items,
  });
}

export function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOutside();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [onOutside]);
  return ref;
}

function SearchBox() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [text, setText] = useState(params.get('q') ?? '');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 250);
    return () => clearTimeout(timer);
  }, [text]);

  const { data: suggestions } = useQuery({
    queryKey: ['suggest', debounced],
    enabled: debounced.length >= 2,
    queryFn: async () =>
      (await api.get<{ items: Product[] }>('/products/suggest', { params: { q: debounced } })).data
        .items,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setOpen(false);
    const q = text.trim();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <div ref={ref} className="relative w-full">
      <form onSubmit={submit} role="search" className="flex h-10 overflow-hidden rounded-full border border-neutral-200 bg-white">
        <input
          type="search"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search products"
          aria-label="Search products"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-neutral-500"
        />
        <button type="submit" aria-label="Search" className="flex w-10 items-center justify-center bg-brand text-white hover:bg-brand-dark">
          <Search className="size-4" />
        </button>
      </form>
      {open && debounced.length >= 2 && suggestions?.length === 0 && (
        <div role="status" className="absolute inset-x-0 top-12 z-40 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <BasketSearchAnimation className="w-20 shrink-0" />
          <p className="min-w-0 break-words text-sm text-neutral-700">
            <span className="block font-semibold">No products found</span>
            Nothing in the basket for “{debounced}”.
          </p>
        </div>
      )}
      {open && debounced.length >= 2 && suggestions && suggestions.length > 0 && (
        <ul className="absolute inset-x-0 top-12 z-40 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          {suggestions.map((item) => (
            <li key={item._id}>
              <Link
                to={`/products/${item.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-brand-soft"
              >
                <SmartImage src={item.images[0]} className="size-9 shrink-0 rounded" />
                <span className="line-clamp-1 flex-1">{item.name}</span>
                <span className="font-medium text-brand">{money(item.priceMin)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountMenu() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  if (!user) {
    return (
      <Link
        to="/login"
        className="hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-4 py-2 font-medium text-white transition hover:bg-brand-dark md:flex"
      >
        <UserIcon className="size-4" />
        Sign in
      </Link>
    );
  }

  const links = [
    { to: '/account', label: 'My account', icon: UserIcon },
    { to: '/account/orders', label: 'My orders', icon: Package },
    { to: '/wishlist', label: 'Wishlist', icon: Heart },
    ...(user.role === 'admin' ? [{ to: '/admin', label: 'Admin panel', icon: ShieldCheck }] : []),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 whitespace-nowrap hover:text-brand"
      >
        <UserIcon className="size-4" />
        <span className="hidden max-w-40 truncate sm:inline">Hello, {user.name}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-8 z-40 w-48 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
          {links.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-brand-soft">
              <Icon className="size-4" /> {label}
            </Link>
          ))}
          <button
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate('/');
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-brand-soft"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function AllCategories({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const location = useLocation();
  useEffect(() => setOpen(false), [location]);
  const top = categories.filter((category) => !category.parent);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold shadow-sm"
      >
        <Menu className="size-4" /> All Categories
        <ChevronDown className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-40 grid max-h-[70vh] w-[min(90vw,620px)] grid-cols-1 gap-x-4 gap-y-3 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4 shadow-lg sm:grid-cols-2">
          {top.map((category) => (
            <div key={category._id}>
              <Link to={`/products?category=${category.slug}`} className="flex items-center gap-2 text-sm font-semibold hover:text-brand">
                <CategoryIcon category={category} className="size-5 shrink-0" /> {category.name}
              </Link>
              <ul className="mt-1 space-y-0.5 pl-7">
                {categories
                  .filter((child) => child.parent === category._id)
                  .map((child) => (
                    <li key={child._id}>
                      <Link to={`/products?category=${child.slug}`} className="text-xs text-neutral-600 hover:text-brand">
                        {child.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const count = useCart(selectCount);
  const { data: categories = [], isPending: categoriesLoading } = useCategories();
  const navCategories = categories.filter((category) => category.showInNav);

  return (
    <header className="bg-brand-soft">
      <div className="bg-gradient-to-r from-[#d6006c] to-[#df4078] text-white">
        <div className="container-page flex h-8 items-center justify-between gap-3 text-xs">
          <p className="flex min-w-0 items-center gap-2 truncate">
            <Store className="size-3.5 shrink-0" /> DALI | Everything in One Basket
          </p>
          <nav className="flex shrink-0 items-center gap-5" aria-label="Quick links">
            <Link to="/track" className="flex items-center gap-1.5 hover:underline">
              <Truck className="size-3.5" /> <span className="hidden sm:inline">Track your order</span>
            </Link>
          </nav>
        </div>
      </div>

      <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-2 py-2">
        <Logo className="h-11 sm:h-12" />
        <div className="order-3 w-full md:order-none md:w-auto md:flex-1 md:px-8 lg:px-16">
          <SearchBox />
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm sm:gap-5">
          <Link to="/wishlist" className="hover:text-brand" aria-label="Wishlist">
            <Heart className="size-5" />
          </Link>
          <Link to="/cart" className="relative hover:text-brand" aria-label={`Cart, ${count} items`}>
            <ShoppingCart className="size-5" />
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-white tabular-nums">
              {count > 99 ? '99+' : count}
            </span>
          </Link>
          <AccountMenu />
        </div>
      </div>

      <div className="container-page flex items-center gap-3 pb-3 pt-1">
        <AllCategories categories={categories} />
        {categoriesLoading && <NavPillsSkeleton />}
        <nav className="scrollbar-none flex min-w-0 gap-2 overflow-x-auto" aria-label="Featured categories">
          {navCategories.map((category) => (
            <Link
              key={category._id}
              to={`/products?category=${category.slug}`}
              className="whitespace-nowrap rounded-full border border-brand-line bg-brand-soft px-3.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-brand hover:text-brand"
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
