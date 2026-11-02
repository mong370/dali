import { House, LayoutGrid, ShoppingBag, UserRound, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';

function Tab({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] transition-colors ${active ? 'font-semibold text-brand' : 'font-medium text-neutral-600'}`}
    >
      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? 'bg-brand-soft' : ''}`}
      >
        <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
      </span>
      {label}
    </Link>
  );
}

/** Phone-sized screens only. StoreLayout reserves matching space so it never covers content. */
export function BottomNav() {
  const { pathname, search } = useLocation();
  const signedIn = useAuth((state) => Boolean(state.user));
  const inCategory =
    pathname === '/categories' || (pathname === '/products' && search.includes('category='));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex rounded-t-2xl border-t border-brand-line bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(231,0,94,0.08)] md:hidden"
    >
      <Tab to="/" label="Home" icon={House} active={pathname === '/'} />
      <Tab to="/categories" label="Category" icon={LayoutGrid} active={inCategory} />
      <Tab
        to="/products"
        label="Products"
        icon={ShoppingBag}
        active={pathname.startsWith('/products') && !inCategory}
      />
      {signedIn ? (
        <Tab to="/account" label="Account" icon={UserRound} active={pathname.startsWith('/account')} />
      ) : (
        <Tab
          to="/login"
          label="Sign in"
          icon={UserRound}
          active={pathname === '/login' || pathname === '/register'}
        />
      )}
    </nav>
  );
}
