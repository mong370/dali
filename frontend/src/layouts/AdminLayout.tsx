import { ArrowLeft, Image, LayoutDashboard, Package, ShoppingBag, Tags, Ticket, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { AdminHeader } from './AdminHeader';

const LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { to: '/admin/content', label: 'Banners', icon: Image },
  { to: '/admin/users', label: 'Users', icon: Users },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-neutral-50 lg:flex">
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" aria-hidden onClick={() => setMenuOpen(false)} />
      )}
      <aside
        id="admin-menu"
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] overflow-y-auto border-r border-neutral-200 bg-white transition-all duration-200 lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-56 lg:shrink-0 lg:translate-x-0 ${menuOpen ? 'translate-x-0' : 'invisible -translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4">
          <Logo className="h-9" />
          <button ref={closeButton} className="rounded-full p-2 hover:bg-brand-soft lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>
        <nav aria-label="Admin" className="flex flex-col gap-1 px-2 pb-4">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm lg:py-2 ${isActive ? 'bg-brand-soft font-medium text-brand' : 'text-neutral-700 hover:bg-neutral-100'}`}>
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
          <Link to="/" className="mt-4 flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-brand">
            <ArrowLeft className="size-4" /> Back to store
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <AdminHeader menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} />
        <main className="p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
